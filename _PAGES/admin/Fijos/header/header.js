"use client"
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import estilos from './header.module.css'
import { verificarSesionAdmin, cerrarSesionAdmin } from './servidor'

export default function HeaderAdmin() {
    const router = useRouter()
    const pathname = usePathname()
    const [menuAbierto, setMenuAbierto] = useState(false)
    const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
    const [modoOscuro, setModoOscuro] = useState(false)
    const [admin, setAdmin] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const temaGuardado = localStorage.getItem('tema')
        if (temaGuardado === 'oscuro') {
            setModoOscuro(true)
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.setAttribute('data-theme', 'light')
        }

        verificarAcceso()
    }, [])

    const verificarAcceso = async () => {
        try {
            const resultado = await verificarSesionAdmin()
            
            if (!resultado.success || !resultado.esAdmin) {
                router.push('/')
                return
            }

            setAdmin(resultado.admin)
            setCargando(false)
        } catch (error) {
            console.log('Error al verificar acceso:', error)
            router.push('/')
        }
    }

    const alternarMenu = () => {
        setMenuAbierto(!menuAbierto)
    }

    const cerrarMenu = () => {
        setMenuAbierto(false)
    }

    const alternarMenuPerfil = () => {
        setMenuPerfilAbierto(!menuPerfilAbierto)
    }

    const cerrarMenuPerfil = () => {
        setMenuPerfilAbierto(false)
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
        cerrarMenuPerfil()
    }

    const cerrarSesion = async () => {
        try {
            await cerrarSesionAdmin()
            router.push('/')
        } catch (error) {
            console.log('Error al cerrar sesion:', error)
        }
    }

    const esRutaActiva = (ruta) => {
        return pathname === ruta
    }

    if (cargando) {
        return (
            <header className={estilos.header}>
                <div className={estilos.contenedor}>
                    <div className={estilos.logo}>
                        <ion-icon name="shield-checkmark-outline"></ion-icon>
                        <span>Admin Panel</span>
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
                        <span>Admin Panel</span>
                    </div>

                    <nav className={estilos.navDesktop}>
                        <button 
                            onClick={() => navegarA('/admin')} 
                            className={`${estilos.navLink} ${esRutaActiva('/admin') ? estilos.activo : ''}`}
                        >
                            <ion-icon name="home-outline"></ion-icon>
                            <span>Dashboard</span>
                        </button>
                        <button 
                            onClick={() => navegarA('/admin/usuarios')} 
                            className={`${estilos.navLink} ${esRutaActiva('/admin/usuarios') ? estilos.activo : ''}`}
                        >
                            <ion-icon name="people-outline"></ion-icon>
                            <span>Usuarios</span>
                        </button>
                        <button 
                            onClick={() => navegarA('/admin/licencias')} 
                            className={`${estilos.navLink} ${esRutaActiva('/admin/licencias') ? estilos.activo : ''}`}
                        >
                            <ion-icon name="key-outline"></ion-icon>
                            <span>Licencias</span>
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

                        <div className={estilos.perfilWrapper}>
                            <button 
                                onClick={alternarMenuPerfil}
                                className={estilos.perfil}
                            >
                                <div className={estilos.avatarContainer}>
                                    <div className={estilos.avatar}>
                                        <ion-icon name="person-outline"></ion-icon>
                                    </div>
                                </div>
                                <div className={estilos.perfilInfo}>
                                    <span className={estilos.nombre}>{admin?.nombre}</span>
                                    <span className={estilos.rol}>Administrador</span>
                                </div>
                                <ion-icon name={menuPerfilAbierto ? "chevron-up-outline" : "chevron-down-outline"} className={estilos.iconoFlecha}></ion-icon>
                            </button>

                            {menuPerfilAbierto && (
                                <>
                                    <div className={estilos.overlayPerfil} onClick={cerrarMenuPerfil}></div>
                                    <div className={estilos.menuDesplegable}>
                                        <button 
                                            onClick={() => navegarA('/admin/notificaciones')} 
                                            className={estilos.menuItem}
                                        >
                                            <ion-icon name="notifications-outline"></ion-icon>
                                            <span>Notificaciones</span>
                                        </button>
                                        <button 
                                            onClick={() => navegarA('/admin/configuracion')} 
                                            className={estilos.menuItem}
                                        >
                                            <ion-icon name="settings-outline"></ion-icon>
                                            <span>Configuracion</span>
                                        </button>
                                        <div className={estilos.divisorMenu}></div>
                                        <button 
                                            onClick={cerrarSesion} 
                                            className={estilos.menuItemSalir}
                                        >
                                            <ion-icon name="log-out-outline"></ion-icon>
                                            <span>Cerrar Sesion</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

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
                        <span>Admin Panel</span>
                    </div>
                    <div className={estilos.perfilMenu}>
                        <div className={estilos.avatarMenu}>
                            <ion-icon name="person-outline"></ion-icon>
                        </div>
                        <div className={estilos.infoMenu}>
                            <span className={estilos.nombreMenu}>{admin?.nombre}</span>
                            <span className={estilos.emailMenu}>{admin?.email}</span>
                        </div>
                    </div>
                </div>

                <nav className={estilos.navMovil}>
                    <button 
                        onClick={() => navegarA('/admin')} 
                        className={`${estilos.navItemMovil} ${esRutaActiva('/admin') ? estilos.activoMovil : ''}`}
                    >
                        <ion-icon name="home-outline"></ion-icon>
                        <span>Dashboard</span>
                    </button>
                    <button 
                        onClick={() => navegarA('/admin/usuarios')} 
                        className={`${estilos.navItemMovil} ${esRutaActiva('/admin/usuarios') ? estilos.activoMovil : ''}`}
                    >
                        <ion-icon name="people-outline"></ion-icon>
                        <span>Usuarios</span>
                    </button>
                    <button 
                        onClick={() => navegarA('/admin/licencias')} 
                        className={`${estilos.navItemMovil} ${esRutaActiva('/admin/licencias') ? estilos.activoMovil : ''}`}
                    >
                        <ion-icon name="key-outline"></ion-icon>
                        <span>Licencias</span>
                    </button>
                    <button 
                        onClick={() => navegarA('/admin/notificaciones')} 
                        className={`${estilos.navItemMovil} ${esRutaActiva('/admin/notificaciones') ? estilos.activoMovil : ''}`}
                    >
                        <ion-icon name="notifications-outline"></ion-icon>
                        <span>Notificaciones</span>
                    </button>
                    <button 
                        onClick={() => navegarA('/admin/configuracion')} 
                        className={`${estilos.navItemMovil} ${esRutaActiva('/admin/configuracion') ? estilos.activoMovil : ''}`}
                    >
                        <ion-icon name="settings-outline"></ion-icon>
                        <span>Configuracion</span>
                    </button>
                </nav>

                <div className={estilos.menuFooter}>
                    <button 
                        onClick={cerrarSesion} 
                        className={estilos.botonSalirMovil}
                    >
                        <ion-icon name="log-out-outline"></ion-icon>
                        <span>Cerrar Sesion</span>
                    </button>
                </div>
            </div>
        </>
    )
}