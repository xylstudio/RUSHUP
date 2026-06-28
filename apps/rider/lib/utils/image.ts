export const compressImage = (file: File, maxSizeMB: number = 2, maxWidth: number = 1920): Promise<File> => {
  return new Promise((resolve, reject) => {
    // If the file is smaller than 1MB, no need to compress (or maybe we still want to normalize?)
    // Let's compress anyway to normalize format and strip EXIF (which sometimes causes rotation issues, though Canvas strips it too)
    
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width *= maxWidth / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
}
