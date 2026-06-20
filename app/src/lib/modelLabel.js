// Ultra-short, human-readable abbreviation for an OpenRouter model id, so the
// chat can show which model in the fallback chain answered without clutter.
// 'openai/gpt-oss-120b:free' -> 'GPT-OSS'; unknown ids fall back to the bare
// model name (provider prefix and ':free' suffix stripped).
export function modelLabel(model) {
  if (!model) return ''
  const id = String(model).toLowerCase()
  if (id.includes('gemma')) return 'Gemma'
  if (id.includes('gemini')) return 'Gemini'
  if (id.includes('nemotron')) return 'Nemotron'   // before llama: nvidia ids can contain both
  if (id.includes('gpt')) return 'GPT-OSS'
  if (id.includes('llama')) return 'Llama'
  if (id.includes('claude')) return 'Claude'
  return String(model).split('/').pop().replace(/:free$/, '')
}
