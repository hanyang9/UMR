import numpy as np
import torch

@torch.jit.script
def normalize_angle(x):
    # type: (Tensor) -> Tensor
    return torch.atan2(torch.sin(x), torch.cos(x))

@torch.jit.script
def normalize(x, eps: float = 1e-9):
    # type: (Tensor, float) -> Tensor
    return x / x.norm(p=2, dim=-1).clamp(min=eps, max=None).unsqueeze(-1)

@torch.jit.script
def normalize_exp_map(exp_map):
    # type: (Tensor) -> Tensor
    angle = torch.norm(exp_map, dim=-1)
    angle = angle.clamp_min(1e-9)
    norm_angle = normalize_angle(angle)
    scale = norm_angle / angle
    norm_exp_map = exp_map * scale.unsqueeze(-1)
    return norm_exp_map

@torch.jit.script
def quat_unit(a):
    # type: (Tensor) -> Tensor
    return normalize(a)

@torch.jit.script
def quat_conjugate(q):
    return torch.cat([-q[..., :3], q[..., 3:]], dim=-1)

@torch.jit.script
def quat_pos(x):
    q = x
    z = (q[..., 3:] < 0).float()
    q = (1 - 2 * z) * q
    return q

@torch.jit.script
def quat_mul(a, b):
    # type: (Tensor, Tensor) -> Tensor
    assert a.shape == b.shape

    x1, y1, z1, w1 = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    x2, y2, z2, w2 = b[..., 0], b[..., 1], b[..., 2], b[..., 3]
    ww = (z1 + x1) * (x2 + y2)
    yy = (w1 - y1) * (w2 + z2)
    zz = (w1 + y1) * (w2 - z2)
    xx = ww + yy + zz
    qq = 0.5 * (xx + (z1 - x1) * (x2 - y2))
    w = qq - ww + (z1 - y1) * (y2 - z2)
    x = qq - xx + (x1 + w1) * (x2 + w2)
    y = qq - yy + (w1 - x1) * (y2 + z2)
    z = qq - zz + (z1 + y1) * (w2 - x2)

    quat = torch.stack([x, y, z, w], dim=-1)
    return quat

@torch.jit.script
def quat_rotate(q, v):
    # type: (Tensor, Tensor) -> Tensor
    q_v = q[..., :3]
    q_w = q[..., -1:]
    t = 2 * torch.cross(q_v, v, dim=-1)
    return v + q_w * t + torch.cross(q_v, t, dim=-1)

@torch.jit.script
def quat_to_axis_angle(q):
    # type: (Tensor) -> Tuple[Tensor, Tensor]
    eps = 1e-5
    qx, qy, qz, qw = 0, 1, 2, 3

    # need to make sure w is not negative to calculate geodesic distance
    q = quat_pos(q)
    length = torch.norm(q[..., qx:qw], dim=-1, p=2)

    angle = 2.0 * torch.atan2(length, q[..., qw])
    axis = q[..., qx:qw] / length.unsqueeze(-1)

    default_axis = torch.zeros_like(axis)
    default_axis[..., -1] = 1
    mask = length > eps

    angle = torch.where(mask, angle, torch.zeros_like(angle))
    mask_expand = mask.unsqueeze(-1)
    axis = torch.where(mask_expand, axis, default_axis)

    return axis, angle

@torch.jit.script
def quat_to_matrix(q):
    # type: (Tensor) -> Tensor
    i, j, k, w = torch.unbind(q, -1)
    two_s = 2.0 / (q * q).sum(-1)

    mat = torch.stack(
        (
            1 - two_s * (j * j + k * k),
            two_s * (i * j - k * w),
            two_s * (i * k + j * w),
            two_s * (i * j + k * w),
            1 - two_s * (i * i + k * k),
            two_s * (j * k - i * w),
            two_s * (i * k - j * w),
            two_s * (j * k + i * w),
            1 - two_s * (i * i + j * j),
        ),
        -1,
    )
    return mat.reshape(q.shape[:-1] + (3, 3))

@torch.jit.script
def quat_to_euler_xyz(q):
    # type: (Tensor) -> Tensor
    # Extract the quaternion components
    x = q[..., 0]
    y = q[..., 1]
    z = q[..., 2]
    w = q[..., 3]
    # Pre-compute repeated calculations
    t0 = 2.0 * (w * x + y * z)
    t1 = 1.0 - 2.0 * (x * x + y * y)
    roll_x = torch.atan2(t0, t1)

    t2 = 2.0 * (w * y - z * x)
    t2 = torch.clamp(t2, min=-1.0, max=1.0)
    pitch_y = torch.asin(t2)

    t3 = 2.0 * (w * z + x * y)
    t4 = 1.0 - 2.0 * (y * y + z * z)
    yaw_z = torch.atan2(t3, t4)

    return torch.stack([roll_x, pitch_y, yaw_z], dim=-1)

def angle_to_matrix(angle, axis):
    # type: (Tensor, string) -> Tensor
    cos = torch.cos(angle)
    sin = torch.sin(angle)
    one = torch.ones_like(angle)
    zero = torch.zeros_like(angle)
    if axis == "X":
        R_flat = (one, zero, zero, zero, cos, -sin, zero, sin, cos)
    elif axis == "Y":
        R_flat = (cos, zero, sin, zero, one, zero, -sin, zero, cos)
    elif axis == "Z":
        R_flat = (cos, -sin, zero, sin, cos, zero, zero, zero, one)
    else:
        raise ValueError("letter must be either X, Y or Z.")

    return torch.stack(R_flat, -1).reshape(angle.shape + (3, 3))

def euler_angle_to_matrix(euler, axis_order):
    b = 1 if len(euler.shape)<=1 else euler.shape[0]
    euler = euler[None,...] if len(euler.shape)==0 else euler
    mat = torch.eye(3)[None,...].repeat(b,1,1).type_as(euler)
    for i in range(len(axis_order)):
        mat_0 = angle_to_matrix(euler[...,i], axis_order[i])
        mat = torch.matmul(mat, mat_0)
    return mat

@torch.jit.script
def matrix_to_axis_angle(R):
    # type: (Tensor) -> Tuple[Tensor, Tensor]
    trace = R[...,0,0] +  R[...,1,1] +  R[...,2,2]
    cs =  torch.clip((trace - 1) / 2, -1+1e-7, 1-1e-7)
    angle = torch.acos(cs)
    rx = R[..., 2, 1] - R[..., 1, 2]
    ry = R[..., 0, 2] - R[..., 2, 0]
    rz = R[..., 1, 0] - R[..., 0, 1]
    axis = torch.stack([rx, ry, rz], dim=-1)
    norm = torch.norm(axis, dim =-1, keepdim=True)
    mask = norm < 1e-5
    norm[mask] = 1.0
    axis = axis / norm
    return axis, angle

@torch.jit.script
def axis_angle_to_quat(axis, angle):
    # type: (Tensor, Tensor) -> Tensor
    theta = (angle / 2).unsqueeze(-1)
    xyz = normalize(axis) * theta.sin()
    w = theta.cos()
    return quat_unit(torch.cat([xyz, w], dim=-1))

@torch.jit.script
def axis_angle_to_exp_map(axis, angle):
    # type: (Tensor, Tensor) -> Tensor
    angle_expand = angle.unsqueeze(-1)
    exp_map = angle_expand * axis
    return exp_map

@torch.jit.script
def matrix_to_quat(R):
    # type: (Tensor) -> Tensor
    axis, angle = matrix_to_axis_angle(R)
    quat = axis_angle_to_quat(axis, angle)
    return quat

@torch.jit.script
def quat_to_exp_map(q):
    # type: (Tensor) -> Tensor
    axis, angle = quat_to_axis_angle(q)
    exp_map = axis_angle_to_exp_map(axis, angle)
    return exp_map


@torch.jit.script
def matrix_to_exp_map(R):
    # type: (Tensor) -> Tensor
    quat = matrix_to_quat(R)
    exp_map = quat_to_exp_map(quat)
    return exp_map

@torch.jit.script
def quat_to_tan_norm(q):
    # type: (Tensor) -> Tensor
    ref_tan = torch.zeros_like(q[..., 0:3])
    ref_tan[..., 0] = 1
    tan = quat_rotate(q, ref_tan)

    ref_norm = torch.zeros_like(q[..., 0:3])
    ref_norm[..., -1] = 1
    norm = quat_rotate(q, ref_norm)

    norm_tan = torch.cat([tan, norm], dim=len(tan.shape) - 1)
    return norm_tan

@torch.jit.script
def tan_norm_to_matrix(tan_norm):
    # type: (Tensor) -> Tensor
    tan = tan_norm[..., 0:3]
    norm = tan_norm[..., 3:6]
    col2 = torch.cross(norm, tan, dim=-1)
    mat3 = torch.cat([tan.unsqueeze(-2), col2.unsqueeze(-2), norm.unsqueeze(-2)], dim=-2)
    mat3 = torch.transpose(mat3, -1, -2)
    return mat3

@torch.jit.script
def tan_norm_to_quat(tan_norm):
    # type: (torch.Tensor) -> torch.Tensor
    mat = tan_norm_to_matrix(tan_norm)
    quat = matrix_to_quat(mat)
    return quat

@torch.jit.script
def exp_map_to_axis_angle(exp_map):
    # type: (Tensor) -> Tuple[Tensor, Tensor]
    min_theta = 1e-5

    angle = torch.norm(exp_map, dim=-1)
    angle_exp = torch.unsqueeze(angle, dim=-1)
    axis = exp_map / angle_exp
    angle = normalize_angle(angle)

    default_axis = torch.zeros_like(exp_map)
    default_axis[..., -1] = 1

    mask = torch.abs(angle) > min_theta
    angle = torch.where(mask, angle, torch.zeros_like(angle))
    mask_expand = mask.unsqueeze(-1)
    axis = torch.where(mask_expand, axis, default_axis)

    return axis, angle

@torch.jit.script
def exp_map_to_quat(exp_map):
    # type: (Tensor) -> Tensor
    axis, angle = exp_map_to_axis_angle(exp_map)
    q = axis_angle_to_quat(axis, angle)
    return q

@torch.jit.script
def quat_diff(q0, q1):
    dq = quat_mul(q1, quat_conjugate(q0))
    return dq

@torch.jit.script
def quat_diff_angle(q0, q1):
    dq = quat_diff(q0, q1)
    _, angle = quat_to_axis_angle(dq)
    return angle

@torch.jit.script
def quat_abs(x):
    x = x.norm(p=2, dim=-1)
    return x

@torch.jit.script
def quat_normalize(q):
    q = quat_unit(quat_pos(q))  # normalized to positive and unit quaternion
    return q

@torch.jit.script
def slerp(q0, q1, t):
    assert(len(t.shape) == len(q0.shape) - 1)
    # type: (Tensor, Tensor, Tensor) -> Tensor
    cos_half_theta = torch.sum(q0 * q1, dim=-1)

    neg_mask = cos_half_theta < 0
    q1 = torch.where(neg_mask.unsqueeze(-1), -q1, q1)

    cos_half_theta = torch.abs(cos_half_theta)
    cos_half_theta = torch.unsqueeze(cos_half_theta, dim=-1)

    half_theta = torch.acos(cos_half_theta)
    sin_half_theta = torch.sqrt(1.0 - cos_half_theta * cos_half_theta)

    t = t.unsqueeze(-1)
    ratioA = torch.sin((1 - t) * half_theta) / sin_half_theta
    ratioB = torch.sin(t * half_theta) / sin_half_theta

    new_q = ratioA * q0 + ratioB * q1

    new_q = torch.where(torch.abs(sin_half_theta) < 0.001, 0.5 * q0 + 0.5 * q1, new_q)
    new_q = torch.where(torch.abs(cos_half_theta) >= 1, q0, new_q)

    return new_q

@torch.jit.script
def calc_heading(q):
    # type: (Tensor) -> Tensor
    ref_dir = torch.zeros_like(q[..., 0:3])
    ref_dir[..., 0] = 1
    rot_dir = quat_rotate(q, ref_dir)

    heading = torch.atan2(rot_dir[..., 1], rot_dir[..., 0])
    return heading

@torch.jit.script
def calc_heading_quat(q):
    # type: (Tensor) -> Tensor
    heading = calc_heading(q)
    axis = torch.zeros_like(q[..., 0:3])
    axis[..., 2] = 1

    heading_q = axis_angle_to_quat(axis, heading)
    return heading_q

@torch.jit.script
def calc_heading_quat_inv(q):
    # type: (Tensor) -> Tensor
    heading = calc_heading(q)
    axis = torch.zeros_like(q[..., 0:3])
    axis[..., 2] = 1

    heading_q = axis_angle_to_quat(axis, -heading)
    return heading_q

# from isaacgym.torch_utils
@torch.jit.script
def euler_xyz_to_quat(roll, pitch, yaw):
    cy = torch.cos(yaw * 0.5)
    sy = torch.sin(yaw * 0.5)
    cr = torch.cos(roll * 0.5)
    sr = torch.sin(roll * 0.5)
    cp = torch.cos(pitch * 0.5)
    sp = torch.sin(pitch * 0.5)

    qw = cy * cr * cp + sy * sr * sp
    qx = cy * sr * cp - sy * cr * sp
    qy = cy * cr * sp + sy * sr * cp
    qz = sy * cr * cp - cy * sr * sp

    return torch.stack([qx, qy, qz, qw], dim=-1)

@torch.jit.script
def euler_xyz_to_exp_map(roll, pitch, yaw):
    # type: (Tensor, Tensor, Tensor) -> Tensor
    q = euler_xyz_to_quat(roll, pitch, yaw)
    exp_map = quat_to_exp_map(q)
    return exp_map

@torch.jit.script
def quat_twist(q, twist_axis):
    q_xyz = q[..., 0:3]
    p = torch.sum(twist_axis * q_xyz, dim=-1)

    twist = q.clone()
    proj = p.unsqueeze(-1) * twist_axis
    twist[..., 0:3] = proj
    twist = quat_normalize(twist)

    return twist

@torch.jit.script
def quat_twist_angle(q, twist_axis):
    twist = quat_twist(q, twist_axis)

    axis, angle = quat_to_axis_angle(twist)
    dot_axis = torch.sum(twist_axis * axis, dim=-1)
    angle[dot_axis < 0] *= -1

    return angle


def add_torch_dict(in_dict, out_dict):
    for k, v in in_dict.items():
        if (v.requires_grad):
            v = v.detach()

        if (k in out_dict):
            out_dict[k] += v
        else:
            out_dict[k] = v
    return

def scale_torch_dict(scale, out_dict):
    for k in out_dict.keys():
        out_dict[k] *= scale
    return

def calc_layers_out_size(layers):
    modules = list(layers.modules())
    for m in reversed(modules):
        if hasattr(m, "out_features"):
            out_size = m.out_features
            break
    return out_size

def eval_minibatch(fn, inputs, batch_size):
    if (batch_size > 0):
        x = next(iter(inputs.values()))
        n = x.shape[0]
        num_batches = int(np.ceil(n / batch_size))

        for i in range(num_batches):
            idx_beg = i * batch_size
            idx_end = min((i + 1) * batch_size, n)
            minibatch_input = {k:v[idx_beg:idx_end] for k, v in inputs.items()}
            minibatch_vals = fn(**minibatch_input)

            if (i == 0):
                vals_shape = [n] + list(minibatch_vals.shape[1:])
                y = torch.zeros(vals_shape, device=minibatch_vals.device, dtype=minibatch_vals.dtype)

            y[idx_beg:idx_end] = minibatch_vals

    else:
        y = fn(**inputs)

    return y


def torch_dtype_to_numpy(torch_dtype):
    if (torch_dtype == torch.float32):
        numpy_dtype = np.float32
    elif (torch_dtype == torch.uint8):
        numpy_dtype = np.uint8
    elif (torch_dtype == torch.int64):
        numpy_dtype = np.int64
    else:
        assert(False), "Unsupported type {}".format(torch_dtype)
    return numpy_dtype

def numpy_dtype_to_torch(numpy_dtype):
    if (numpy_dtype == np.float32):
        torch_dtype = torch.float32
    elif (numpy_dtype == np.uint8):
        torch_dtype = torch.uint8
    elif (numpy_dtype == np.int64):
        torch_dtype = torch.int64
    else:
        assert(False), "Unsupported type {}".format(numpy_dtype)
    return torch_dtype

class UInt8ToFloat(torch.nn.Module):
    def forward(self, x):
        float_x = x.type(torch.float32) / 255.0
        return float_x