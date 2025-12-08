class AudioRecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Check if input exists and has data
    if (input && input.length > 0) {
      const inputChannel = input[0];
      
      // Send audio data to the main thread
      if (inputChannel && inputChannel.length > 0) {
        // We need to copy the data because the underlying buffer is reused
        this.port.postMessage({
          audioData: inputChannel.slice()
        }, [inputChannel.buffer]);
      }
      
      // Pass through audio for local monitoring if needed
      // (though for voice chat we usually mute local feedback)
      // if (output && output[0]) {
      //   output[0].set(inputChannel);
      // }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-recorder-worklet', AudioRecorderWorklet);
