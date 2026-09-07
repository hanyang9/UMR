self.onmessage = (event) => {
  const {
    buffer,
    byteOffset,
    length,
    byteShuffle,
    frameWidth,
    encoding,
    dequantize,
    quantizationScale,
    quantizationOffset,
  } = event.data;
  let decodedBuffer = buffer;
  let decodedByteOffset = byteOffset;

  if (byteShuffle > 1) {
    const source = new Uint8Array(buffer, byteOffset, length * byteShuffle);
    const restored = new Uint8Array(source.byteLength);
    for (let byteIndex = 0; byteIndex < byteShuffle; byteIndex++) {
      let sourceIndex = byteIndex * length;
      let destinationIndex = byteIndex;
      for (let element = 0; element < length; element++) {
        restored[destinationIndex] = source[sourceIndex++];
        destinationIndex += byteShuffle;
      }
    }
    decodedBuffer = restored.buffer;
    decodedByteOffset = 0;
  }

  const words = new Uint16Array(decodedBuffer, decodedByteOffset, length);

  if (
    encoding === "spatiotemporal-delta-i16" ||
    encoding === "second-temporal-spatial-delta-i16"
  ) {
    for (let frameStart = frameWidth; frameStart < words.length; frameStart += frameWidth) {
      const previous = frameStart - frameWidth;
      for (let index = 0; index < frameWidth; index++) {
        words[frameStart + index] += words[previous + index];
      }
    }
    if (encoding === "second-temporal-spatial-delta-i16") {
      for (let frameStart = frameWidth; frameStart < words.length; frameStart += frameWidth) {
        const previous = frameStart - frameWidth;
        for (let index = 0; index < frameWidth; index++) {
          words[frameStart + index] += words[previous + index];
        }
      }
    }
    for (let frameStart = 0; frameStart < words.length; frameStart += frameWidth) {
      for (let index = 3; index < frameWidth; index++) {
        words[frameStart + index] += words[frameStart + index - 3];
      }
    }
  } else if (encoding === "xor-delta-i16") {
    for (let frameStart = frameWidth; frameStart < words.length; frameStart += frameWidth) {
      const previous = frameStart - frameWidth;
      for (let index = 0; index < frameWidth; index++) {
        words[frameStart + index] ^= words[previous + index];
      }
    }
  }

  if (dequantize) {
    const signed = new Int16Array(decodedBuffer, decodedByteOffset, length);
    const scale = quantizationScale;
    const offset = quantizationOffset;
    const positions = new Float32Array(length);
    for (let index = 0; index < length; index += 3) {
      positions[index] = signed[index] * scale[0] + offset[0];
      positions[index + 1] = signed[index + 1] * scale[1] + offset[1];
      positions[index + 2] = signed[index + 2] * scale[2] + offset[2];
    }
    self.postMessage(
      { buffer: positions.buffer, byteOffset: 0, length, componentType: "f32" },
      [positions.buffer]
    );
    return;
  }

  self.postMessage(
    { buffer: decodedBuffer, byteOffset: decodedByteOffset, length, componentType: "i16" },
    [decodedBuffer]
  );
};
