// 문자열을 파일로 내려받게 하는 브라우저 도우미 (file:// 로 열었을 때도 동작)
export function downloadText(fileName: string, text: string, mimeType: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return true
  } catch {
    return false
  }
}
