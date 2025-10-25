"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import estilos from './login.module.css'
import { iniciarSesion, obtenerTelefonoEmpresa } from './servidor'

export default function Login() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mostrarPassword, setMostrarPassword] = useState(false)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState('')
    const [modoOscuro, setModoOscuro] = useState(false)

    useEffect(() => {
        const temaGuardado = localStorage.getItem('tema')
        if (temaGuardado === 'oscuro') {
            setModoOscuro(true)
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-theme', 'light')
        }
    }, [])

    const manejarSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Por favor completa todos los campos')
            return
        }

        setCargando(true)

        try {
            const resultado = await iniciarSesion(email, password)

            if (resultado.success) {
                if (resultado.rol === 'administrador') {
                    router.push('/admin')
                } else if (resultado.rol === 'usuario') {
                    router.push('/usuario')
                }
            } else {
                setError(resultado.mensaje || 'Error al iniciar sesion')
            }
        } catch (error) {
            console.log('Error al iniciar sesion:', error)
            setError('Error al conectar con el servidor')
        } finally {
            setCargando(false)
        }
    }

    const abrirWhatsAppRegistro = async () => {
        try {
            const telefono = await obtenerTelefonoEmpresa()
            if (telefono) {
                const mensaje = encodeURIComponent('Hola, quiero registrarme en la aplicacion')
                window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank')
            }
        } catch (error) {
            console.log('Error al abrir WhatsApp:', error)
        }
    }

    const abrirWhatsAppRecuperacion = async () => {
        try {
            const telefono = await obtenerTelefonoEmpresa()
            if (telefono) {
                const mensaje = encodeURIComponent('Hola, necesito recuperar mi contraseña')
                window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank')
            }
        } catch (error) {
            console.log('Error al abrir WhatsApp:', error)
        }
    }

    const cambiarTema = () => {
        const nuevoTema = !modoOscuro
        setModoOscuro(nuevoTema)
        
        if (nuevoTema) {
            document.documentElement.setAttribute('data-theme', 'dark')
            localStorage.setItem('tema', 'oscuro')
        } else {
            document.documentElement.setAttribute('data-theme', 'light')
            localStorage.setItem('tema', 'claro')
        }
    }

    return (
        <div className={estilos.contenedor}>
            <button 
                onClick={cambiarTema} 
                className={estilos.botonTema}
                aria-label="Cambiar tema"
            >
                <ion-icon name={modoOscuro ? "sunny-outline" : "moon-outline"}></ion-icon>
            </button>

            <div className={estilos.tarjeta}>
                <div className={estilos.header}>
                    <div className={estilos.logo}>
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                    </div>
                    <h1 className={estilos.titulo}>Iniciar Sesion</h1>
                    <p className={estilos.subtitulo}>Ingresa tus credenciales para acceder</p>
                </div>

                <form onSubmit={manejarSubmit} className={estilos.formulario}>
                    {error && (
                        <div className={estilos.error}>
                            <ion-icon name="alert-circle-outline"></ion-icon>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={estilos.campo}>
                        <label htmlFor="email" className={estilos.label}>
                            <ion-icon name="mail-outline"></ion-icon>
                            <span>Correo Electronico</span>
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={estilos.input}
                            placeholder="tu@email.com"
                            disabled={cargando}
                        />
                    </div>

                    <div className={estilos.campo}>
                        <label htmlFor="password" className={estilos.label}>
                            <ion-icon name="lock-closed-outline"></ion-icon>
                            <span>Contraseña</span>
                        </label>
                        <div className={estilos.inputPassword}>
                            <input
                                id="password"
                                type={mostrarPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={estilos.input}
                                placeholder="Ingresa tu contraseña"
                                disabled={cargando}
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                                className={estilos.togglePassword}
                                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                <ion-icon name={mostrarPassword ? "eye-off-outline" : "eye-outline"}></ion-icon>
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={abrirWhatsAppRecuperacion}
                        className={estilos.olvidaste}
                    >
                        Olvidaste tu contraseña?
                    </button>

                    <button
                        type="submit"
                        className={estilos.botonSubmit}
                        disabled={cargando}
                    >
                        {cargando ? (
                            <>
                                <ion-icon name="hourglass-outline" className={estilos.iconoCargando}></ion-icon>
                                <span>Iniciando sesion...</span>
                            </>
                        ) : (
                            <>
                                <ion-icon name="log-in-outline"></ion-icon>
                                <span>Iniciar Sesion</span>
                            </>
                        )}
                    </button>
                </form>

                <div className={estilos.divisor}>
                    <span className={estilos.divisorTexto}>o</span>
                </div>

                <div className={estilos.seccionRegistro}>
                    <p className={estilos.textoRegistro}>¿No tienes cuenta?</p>
                    <button
                        onClick={abrirWhatsAppRegistro}
                        className={estilos.botonRegistro}
                    >
                        <ion-icon name="logo-whatsapp"></ion-icon>
                        <span>Solicitar registro</span>
                    </button>
                </div>

                <p className={estilos.info}>
                    <ion-icon name="information-circle-outline"></ion-icon>
                    <span>Para registrarte o recuperar tu contraseña, contactanos por WhatsApp</span>
                </p>
            </div>
        </div>
    )
}