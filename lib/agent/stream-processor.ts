/// <reference types="chrome"/>

/**
 * Processes stream events from LangGraph and posts messages to the active Chrome Port.
 */
export async function processStreamEvents(
  eventStream: AsyncIterable<any>,
  port: chrome.runtime.Port | null | undefined
) {
  for await (const { event, name, data } of eventStream) {
    if (event === 'on_chain_start' && name) {
      console.log(`[LangGraph Step] 🟢 Node Start: ${name}`, data);
    } else if (event === 'on_chain_end' && name) {
      console.log(`[LangGraph Step] 🔴 Node End: ${name}`, data);
    } else if (event === 'on_chat_model_stream' && data.chunk) {
      port?.postMessage({
        type: 'stream_chunk',
        chunk: {
          content: data.chunk.content || '',
          tool_call_chunks: data.chunk.tool_call_chunks || [],
          additional_kwargs: data.chunk.additional_kwargs || {}
        }
      });
    } else if (event === 'on_tool_start') {
      console.log(`[LangGraph Step] 🛠️ Tool Start: ${name}`, data.input);
      port?.postMessage({
        type: 'tool_start',
        name: name,
        input: data.input
      });
    } else if (event === 'on_tool_end') {
      console.log(`[LangGraph Step] ✅ Tool End: ${name}`);
      port?.postMessage({
        type: 'tool_end',
        name: name,
        output: data.output
      });
    }
  }
}
