import { useEffect, useRef, useState } from 'react'

import '@tensorflow/tfjs-backend-webgl'
import * as mpHands from '@mediapipe/hands'
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm'
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection'

tfjsWasm.setWasmPaths(
  `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`,
)

const socket = new WebSocket('ws://localhost:8000/ws')

socket.onopen = () => {
  console.log('WebSocket Client Connected')
}

socket.onerror = (error) => {
  console.log('WebSocket Connection Error: ' + error.toString())
}

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frame = useRef(0)
  let detector: handPoseDetection.HandDetector | null = null
  const [result, setResult] = useState('')
  const [coordinates, setCoordinates] = useState([] as any[])

  socket.onmessage = (message) => {
    setResult(message.data)
  }

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

    if (video && canvas) {
      const ctx = canvas.getContext('2d')

      if (ctx) {
        ctx?.clearRect(0, 0, video.videoWidth, video.videoHeight)
        ctx.drawImage(video, 0, 0, video.width, video.height)
      }
    }
  }

  function landmarkCoordinates(landmarks: any[]) {
    const coordinates: any[] = []
    const coordinatesX: any[] = []
    const coordinatesY: any[] = []

    landmarks.forEach((landmark) => {
      coordinatesX.push(landmark.x)
      coordinatesY.push(landmark.y)
    })

    landmarks.forEach((landmark) => {
      coordinates.push(landmark.x - Math.min(...coordinatesX))
      coordinates.push(landmark.y - Math.min(...coordinatesY))
    })

    return coordinates
  }

  async function estimateHands() {
    const video = videoRef.current

    if (video) {
      const handsPredictions = await detector?.estimateHands(video, {
        flipHorizontal: false,
      })

      if (handsPredictions?.length) {
        const landmarks = handsPredictions[0].keypoints3D as any[]
        const landmarksCoordinates = landmarkCoordinates(landmarks)

        if (landmarksCoordinates.length === 42) {
          setCoordinates(landmarksCoordinates)
        }
      }
    }
  }

  async function loadDetector() {
    if (!detector) {
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        modelType: 'full' as const,
        maxHands: 2,
        solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${mpHands.VERSION}`,
      }

      detector = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        detectorConfig,
      )
    }
  }

  async function init() {
    await setupVideo()
    setupCanvas()
    await loadDetector()
    handleVideoFrame()
  }

  function handleVideoFrame() {
    drawVideoInCanvas()
    estimateHands()

    frame.current = requestAnimationFrame(handleVideoFrame)
  }

  function handleTranslateSignal() {
    if (coordinates) {
      socket.send(JSON.stringify({ landmarks: coordinates }))
    }
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

        <span className="mt-8 text-gray-600 text-md">
          Faça o sinal para a camera e aperte em traduzir para ver o resultado
        </span>

        <button
          type="button"
          className="h-14 w-32 flex items-center justify-center rounded-md bg-blue-600 text-white font-bold px-4 mt-8 text-lg"
          onClick={handleTranslateSignal}
        >
          Traduzir
        </button>

        {result && (
          <p className="mt-8 text-center text-2xl text-black font-bold">
            Resultado: {result}
          </p>
        )}
      </div>
    </main>
  )
}
