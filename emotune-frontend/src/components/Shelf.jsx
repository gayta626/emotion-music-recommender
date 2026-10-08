import { useCallback, useRef, useState } from 'react'
import './Shelf.scss'

// Mot hang tren trang chu kieu Spotify: tieu de to + "Show all" ben phai, the xep 1 hang cuon ngang,
// re chuot hien mui ten ‹ › de cuon. "Show all" -> xep thanh luoi (nhieu dong), bam lai "Show less".
// note: chuoi bao loi / trong -> hien thay cho hang the.
const Shelf = ({ title, eyebrow, note, className = '', children }) => {
    const nodeRef = useRef(null)
    const [edges, setEdges] = useState({ left: false, right: false })
    const [expanded, setExpanded] = useState(false)

    // con cuon duoc sang trai/phai khong (an mui ten + "Show all" khi khong can)
    const measure = useCallback(() => {
        const el = nodeRef.current
        if (!el) return
        const left = el.scrollLeft > 4
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
        setEdges((old) => (old.left === left && old.right === right ? old : { left, right }))
    }, [])

    // callback ref: hang the moi gan vao trang -> theo doi cuon, doi kich thuoc, them/bot the
    const trackRef = useCallback((node) => {
        nodeRef.current = node
        if (!node) return
        const resize = new ResizeObserver(measure)
        // danh sach the doi (tai xong, doi chip the loai) -> ve dau hang; khong thi scroll-snap
        // "bam" theo the cu va ca hang bi cuon lech
        const mutate = new MutationObserver(() => {
            node.scrollLeft = 0
            measure()
        })
        resize.observe(node)
        mutate.observe(node, { childList: true })
        node.addEventListener('scroll', measure, { passive: true })
        return () => {
            resize.disconnect()
            mutate.disconnect()
            node.removeEventListener('scroll', measure)
        }
    }, [measure])

    const scroll = (dir) => {
        const el = nodeRef.current
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
    }

    const canExpand = expanded || edges.left || edges.right

    return (
        <section className={`shelf ${className}`}>
            <div className="shelf-head">
                <div>
                    {eyebrow && <p className="shelf-eyebrow">{eyebrow}</p>}
                    <h2>{title}</h2>
                </div>
                {canExpand && !note && (
                    <button className="shelf-all" onClick={() => setExpanded((v) => !v)}>
                        {expanded ? 'Show less' : 'Show all'}
                    </button>
                )}
            </div>

            {note ? (
                <p className="shelf-note">{note}</p>
            ) : (
                <div className="shelf-body">
                    {!expanded && edges.left && (
                        <button className="shelf-arrow left" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>‹</button>
                    )}
                    <div ref={trackRef} className={`shelf-track ${expanded ? 'expanded' : ''}`}>
                        {children}
                    </div>
                    {!expanded && edges.right && (
                        <button className="shelf-arrow right" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>›</button>
                    )}
                </div>
            )}
        </section>
    )
}

export default Shelf
