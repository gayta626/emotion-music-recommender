import { useEffect, useRef } from 'react'
import axios from 'axios'
import { GPIO_URL } from './config'

// Goi sang gpio-service (chi co tren Pi). Tren PC service khong chay -> loi -> bo qua,
// web van chay binh thuong, chi la khong co den / nut.

// state: 'off' | 'scanning' | 'happy' | 'sad' | 'angry' | 'surprise' | 'neutral'
export const setLed = (state) => {
    axios.post(`${GPIO_URL}/led`, { state }).catch(() => { })
}

// Hoi gpio-service moi 300ms xem nut co duoc bam them lan nao khong.
// Service chi tra ve so lan bam -> so voi lan hoi truoc, tang len thi goi ham tuong ung.
export const useHardwareButtons = (handlers) => {
    // luu ham moi nhat vao ref -> interval khong phai tao lai moi lan component render
    const handlersRef = useRef(handlers)
    useEffect(() => {
        handlersRef.current = handlers
    })

    useEffect(() => {
        let last = null
        const intervalId = setInterval(() => {
            axios.get(`${GPIO_URL}/buttons`)
                .then(({ data }) => {
                    // lan dau chi ghi moc, khong tinh cac lan bam truoc khi component xuat hien
                    if (last) {
                        if (data.next > last.next) handlersRef.current.onNext?.()
                        if (data.pause > last.pause) handlersRef.current.onPause?.()
                    }
                    last = data
                })
                .catch(() => { })
        }, 300)
        return () => clearInterval(intervalId)
    }, [])
}
