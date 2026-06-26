class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    // inputs[0][0] is the Float32Array of PCM data for the first channel.
    const inputData = inputs[0][0];
    if (inputData) {
      // Convert to Int16, then post back to main thread.
      // We don't downsample here; the AudioContext should be created with the correct sample rate.
      const buffer = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp the values to [-1, 1] before converting to 16-bit integer
        buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }
      // Post the buffer back to the main thread. The second argument is a list of
      // Transferable objects to transfer ownership, avoiding a copy.
      this.port.postMessage(buffer, [buffer.buffer]);
    }
    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
