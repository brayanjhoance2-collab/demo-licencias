"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import estilos from './header.module.css'
import { verificarSesion, obtenerConfiguracionPublica } from './servidor'

export default function Header() {
    const router = useRouter()
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [modoOscuro, setModoOscuro] = useState(false)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        // Cargar preferencia de tema
        const temaGuardado = localStorage.getItem('tema')
        if (temaGuardado === 'oscuro') {
            setModoOscuro(true)
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-theme', 'light')
        }

        // Verificar sesion
        verificarSesionActual()
    }, [])

    const verificarSesionActual = async () => {
        try {
            const resultado = await verificarSesion()
            
            if (resultado.sesionActiva) {
                // Redirigir segun rol
                if (resultado.rol === 'administrador') {
                    router.push('/admin')
                } else if (resultado.rol === 'usuario') {
                    router.push('/usuario')
                }
            } else {
                setCargando(false)
            }
        } catch (error) {
            console.log('Error al verificar sesion:', error)
            setCargando(false)
        }
    }

    const alternarMenu = () => {
        setMenuAbierto(!menuAbierto)
    }

    const cerrarMenu = () => {
        setMenuAbierto(false)
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

    const navegarA = (ruta) => {
        router.push(ruta)
        cerrarMenu()
    }

    const abrirWhatsApp = async () => {
        try {
            const config = await obtenerConfiguracionPublica()
            if (config.success && config.empresa && config.empresa.telefono_principal) {
                const telefono = config.empresa.telefono_principal.replace(/[^0-9]/g, '')
                const mensaje = encodeURIComponent('Hola, quiero contactarme contigo')
                window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank')
                cerrarMenu()
            } else {
                console.log('No se encontro telefono de empresa')
                cerrarMenu()
            }
        } catch (error) {
            console.log('Error al abrir WhatsApp:', error)
            cerrarMenu()
        }
    }

    if (cargando) {
        return (
            <header className={estilos.header}>
                <div className={estilos.contenedor}>
                    <div className={estilos.logo}>
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                        <span>LicenseApp</span>
                    </div>
                </div>
            </header>
        )
    }

    return (
        <>
            <header className={estilos.header}>
                <div className={estilos.contenedor}>
                    <div className={estilos.logo}>
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                        <span>LicenseApp</span>
                    </div>

                    <nav className={estilos.navDesktop}>
                        <button 
                            onClick={() => navegarA('/')} 
                            className={estilos.navLink}
                        >
                            <ion-icon name="home-outline"></ion-icon>
                            <span>Inicio</span>
                        </button>
                        <button 
                            onClick={abrirWhatsApp} 
                            className={estilos.navLink}
                        >
                            <ion-icon name="logo-whatsapp"></ion-icon>
                            <span>Contactame</span>
                        </button>
                    </nav>

                    <div className={estilos.acciones}>
                        <button 
                            onClick={cambiarTema} 
                            className={estilos.botonTema}
                            aria-label="Cambiar tema"
                        >
                            <ion-icon name={modoOscuro ? "sunny-outline" : "moon-outline"}></ion-icon>
                        </button>

                        <button 
                            onClick={() => navegarA('/')} 
                            className={estilos.botonLogin}
                        >
                            <ion-icon name="log-in-outline"></ion-icon>
                            <span>Iniciar Sesion</span>
                        </button>

                        <button 
                            onClick={alternarMenu} 
                            className={estilos.hamburguesa}
                            aria-label="Abrir menu"
                        >
                            <ion-icon name="menu-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            </header>

            {menuAbierto && <div className={estilos.overlay} onClick={cerrarMenu}></div>}

            <div className={`${estilos.menuLateral} ${menuAbierto ? estilos.menuAbierto : ''}`}>
                <button 
                    onClick={cerrarMenu} 
                    className={estilos.botonCerrar}
                    aria-label="Cerrar menu"
                >
                    <ion-icon name="close-outline"></ion-icon>
                </button>

                <div className={estilos.menuHeader}>
                    <div className={estilos.logoMenu}>
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                        <span>LicenseApp</span>
                    </div>
                </div>

                <nav className={estilos.navMovil}>
                    <button 
                        onClick={() => navegarA('/')} 
                        className={estilos.navItemMovil}
                    >
                        <ion-icon name="home-outline"></ion-icon>
                        <span>Inicio</span>
                    </button>
                    <button 
                        onClick={abrirWhatsApp} 
                        className={estilos.navItemMovil}
                    >
                        <ion-icon name="logo-whatsapp"></ion-icon>
                        <span>Contactame</span>
                    </button>
                </nav>

                <div className={estilos.menuFooter}>
                    <button 
                        onClick={() => navegarA('/')} 
                        className={estilos.botonLoginMovil}
                    >
                        <ion-icon name="log-in-outline"></ion-icon>
                        <span>Iniciar Sesion</span>
                    </button>
                </div>
            </div>
        </>
    )
}