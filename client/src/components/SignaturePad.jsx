import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

// Canvas-based digital signature capture (matches paper's HTML5 Canvas API approach).
const SignaturePad = forwardRef(function SignaturePad(_, ref) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    c.width = rect.width
    c.height = rect.height
    const ctx = c.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0b1f14'
  }, [])

  const pos = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    const p = e.touches ? e.touches[0] : e
    return { x: p.clientX - rect.left, y: p.clientY - rect.top }
  }
  const start = (e) => { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y) }
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); setEmpty(false) }
  const end = () => { drawing.current = false }

  const clear = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setEmpty(true)
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => empty,
    toDataURL: () => (empty ? '' : canvasRef.current.toDataURL('image/png')),
    clear,
  }))

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="sigpad"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div style={{ marginTop: 6 }}>
        <button type="button" className="secondary small" onClick={clear}>Clear signature</button>
      </div>
    </div>
  )
})

export default SignaturePad
