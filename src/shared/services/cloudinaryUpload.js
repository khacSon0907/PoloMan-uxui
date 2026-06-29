import { getApiData, http } from '../api'

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1'

function unwrapSignatureData(response) {
  let data = getApiData(response)

  while (data?.data && typeof data.data === 'object') {
    data = data.data
  }

  return data || {}
}

export async function uploadImageToCloudinary(file, targetType) {
  if (!file) {
    throw new Error('Vui lòng chọn ảnh')
  }

  const signatureResponse = await http.post('/images/signature', { targetType })
  const signatureData = unwrapSignatureData(signatureResponse)
  const cloudName = signatureData.cloudName || signatureData.cloud_name
  const apiKey = signatureData.apiKey || signatureData.api_key
  const uploadUrl = signatureData.uploadUrl || signatureData.upload_url
  const publicId = signatureData.publicId || signatureData.public_id
  const { timestamp, signature, folder } = signatureData

  if (!cloudName || !apiKey || !timestamp || !signature || !folder) {
    throw new Error('Không lấy được chữ ký tải ảnh')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  formData.append('folder', folder)
  if (publicId) formData.append('public_id', publicId)

  const response = await fetch(uploadUrl || `${CLOUDINARY_UPLOAD_URL}/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Tải ảnh lên Cloudinary thất bại')
  }

  return data
}
