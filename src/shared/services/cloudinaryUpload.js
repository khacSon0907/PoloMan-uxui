import { http } from '../api'

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1'

export async function uploadImageToCloudinary(file, targetType) {
  if (!file) {
    throw new Error('Vui lòng chọn ảnh')
  }

  const signatureResponse = await http.post('/images/signature', { targetType })
  const signatureData = signatureResponse?.data ?? signatureResponse
  const { cloudName, apiKey, timestamp, signature, folder } = signatureData

  if (!cloudName || !apiKey || !timestamp || !signature || !folder) {
    throw new Error('Không lấy được chữ ký tải ảnh')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  formData.append('folder', folder)

  const response = await fetch(`${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Tải ảnh lên Cloudinary thất bại')
  }

  return data
}
