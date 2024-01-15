import { useEffect, useRef } from 'react'

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)

  async function setupVideo() {
    const video = videoRef.current

    if (video) {
      const videoConfig = {
        audio: false,
        video: {
          frameRate: {
            ideal: 60,
          },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(videoConfig)
      video.srcObject = stream

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(videoRef.current)
        }
      })

      video.width = video.videoWidth
      video.height = video.videoHeight

      video.play()
    }
  }

  function setupCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video && canvas) {
      canvas.width = video.width
      canvas.height = video.height
    }
  }

  function drawVideoInCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current
    console.log('drawVideoInCanvas')
    if (video && canvas) {
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx?.clearRect(0, 0, video.videoWidth, video.videoHeight)
        ctx.drawImage(video, 0, 0, video.width, video.height)
      }
    }

    handleVideoFrame()
  }

  async function init() {
    await setupVideo()
    setupCanvas()
    handleVideoFrame()
  }

  function handleVideoFrame() {
    frame.current = requestAnimationFrame(drawVideoInCanvas)
  }

  useEffect(() => {
    init()

    return () => cancelAnimationFrame(frame.current)
  }, [])

  return (
    <main className="px-8">
      <div className="min-h-screen py-8 flex-grow flex flex-col items-center">
        <h1 className="text-4xl text-black font-bold mb-8">
          Libras interpreter
        </h1>

        <canvas
          ref={canvasRef}
          style={{
            transform: 'scaleX(-1)',
            zIndex: 1,
            borderRadius: '1rem',
            boxShadow: '0 3px 10px rgb(0 0 0)',
            maxWidth: '85vw',
          }}
          id="canvas"
        ></canvas>

        <video
          ref={videoRef}
          style={{
            visibility: 'hidden',
            transform: 'scaleX(-1)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
          }}
          id="video"
          playsInline
        ></video>
      </div>
    </main>
  )
}
