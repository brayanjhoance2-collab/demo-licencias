"use client"
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import estilos from './notificaciones.module.css'
import { 
    obtenerNotificaciones, 
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    crearNotificacion
} from './servidor'

export default function NotificacionesAdmin() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [notificaciones, setNotificaciones] = useState([])
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        noLeidas: 0,
        porVencer: 0,
        vencidas: 0
    })
    const [cargando, setCargando] = useState(true)
    const [filtroActual, setFiltroActual] = useState('todas')
    const [procesando, setProcesando] = useState(null)
    const [modalCrear, setModalCrear] = useState(false)
    const [modalEliminar, setModalEliminar] = useState(false)
    const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null)
    const [mensajeError, setMensajeError] = useState('')
    const [mensajeExito, setMensajeExito] = useState('')
    
    const [formulario, setFormulario] = useState({
        titulo: '',
        mensaje: '',
        tipo: 'info'
    })

    useEffect(() => {
        const filtroUrl = searchParams.get('filtro') || 'todas'
        setFiltroActual(filtroUrl)
        cargarNotificaciones(filtroUrl)
    }, [searchParams])

    const cargarNotificaciones = async (filtro) => {
        setCargando(true)
        try {
            const resultado = await obtenerNotificaciones(filtro)
            
            if (resultado.success) {
                setNotificaciones(resultado.notificaciones)
                setEstadisticas(resultado.estadisticas)
            }
        } catch (error) {
            console.log('Error al cargar notificaciones:', error)
        } finally {
            setCargando(false)
        }
    }

    const cambiarFiltro = (nuevoFiltro) => {
        const params = new URLSearchParams()
        params.set('filtro', nuevoFiltro)
        router.push(`/admin/notificaciones?${params.toString()}`)
    }

    const manejarMarcarLeida = async (idNotificacion) => {
        setProcesando(idNotificacion)
        try {
            const resultado = await marcarComoLeida(idNotificacion)
            
            if (resultado.success) {
                cargarNotificaciones(filtroActual)
            }
        } catch (error) {
            console.log('Error al marcar como leida:', error)
        } finally {
            setProcesando(null)
        }
    }

    const manejarMarcarTodasLeidas = async () => {
        setProcesando('todas')
        try {
            const resultado = await marcarTodasComoLeidas()
            
            if (resultado.success) {
                mostrarMensajeExito('Todas las notificaciones marcadas como leidas')
                cargarNotificaciones(filtroActual)
            } else {
                mostrarMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al marcar todas como leidas:', error)
            mostrarMensajeError('Error al marcar notificaciones')
        } finally {
            setProcesando(null)
        }
    }

    const abrirModalCrear = () => {
        setFormulario({
            titulo: '',
            mensaje: '',
            tipo: 'info'
        })
        setMensajeError('')
        setModalCrear(true)
    }

    const abrirModalEliminar = (notificacion) => {
        setNotificacionSeleccionada(notificacion)
        setMensajeError('')
        setModalEliminar(true)
    }

    const cerrarModales = () => {
        setModalCrear(false)
        setModalEliminar(false)
        setNotificacionSeleccionada(null)
        setMensajeError('')
    }

    const manejarCambioFormulario = (campo, valor) => {
        setFormulario(prev => ({
            ...prev,
            [campo]: valor
        }))
    }

    const validarFormulario = () => {
        if (!formulario.titulo.trim()) {
            setMensajeError('El titulo es obligatorio')
            return false
        }
        if (!formulario.mensaje.trim()) {
            setMensajeError('El mensaje es obligatorio')
            return false
        }
        return true
    }

    const manejarCrearNotificacion = async (e) => {
        e.preventDefault()
        
        if (!validarFormulario()) return
        
        setProcesando('crear')
        try {
            const resultado = await crearNotificacion(
                formulario.titulo,
                formulario.mensaje,
                formulario.tipo
            )
            
            if (resultado.success) {
                mostrarMensajeExito('Notificacion creada exitosamente')
                cerrarModales()
                cargarNotificaciones(filtroActual)
            } else {
                setMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al crear notificacion:', error)
            setMensajeError('Error al crear notificacion')
        } finally {
            setProcesando(null)
        }
    }

    const manejarEliminarNotificacion = async () => {
        setProcesando('eliminar')
        try {
            const resultado = await eliminarNotificacion(notificacionSeleccionada.id)
            
            if (resultado.success) {
                mostrarMensajeExito('Notificacion eliminada exitosamente')
                cerrarModales()
                cargarNotificaciones(filtroActual)
            } else {
                setMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al eliminar notificacion:', error)
            setMensajeError('Error al eliminar notificacion')
        } finally {
            setProcesando(null)
        }
    }

    const mostrarMensajeExito = (mensaje) => {
        setMensajeExito(mensaje)
        setTimeout(() => setMensajeExito(''), 4000)
    }

    const mostrarMensajeError = (mensaje) => {
        setMensajeError(mensaje)
        setTimeout(() => setMensajeError(''), 4000)
    }

    const formatearFecha = (fecha) => {
        const date = new Date(fecha)
        const ahora = new Date()
        const diferencia = ahora - date
        const minutos = Math.floor(diferencia / 60000)
        const horas = Math.floor(diferencia / 3600000)
        const dias = Math.floor(diferencia / 86400000)

        if (minutos < 1) return 'Ahora'
        if (minutos < 60) return `Hace ${minutos} min`
        if (horas < 24) return `Hace ${horas} h`
        if (dias < 7) return `Hace ${dias} d`
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const obtenerIconoTipo = (tipo) => {
        switch (tipo) {
            case 'exito':
                return 'checkmark-circle-outline'
            case 'advertencia':
                return 'warning-outline'
            case 'error':
                return 'alert-circle-outline'
            default:
                return 'information-circle-outline'
        }
    }

    const obtenerClaseTipo = (tipo) => {
        switch (tipo) {
            case 'exito':
                return estilos.tipoExito
            case 'advertencia':
                return estilos.tipoAdvertencia
            case 'error':
                return estilos.tipoError
            default:
                return estilos.tipoInfo
        }
    }

    const filtros = [
        { id: 'todas', nombre: 'Todas', icono: 'list-outline', cantidad: estadisticas.total },
        { id: 'no-leidas', nombre: 'No Leidas', icono: 'mail-unread-outline', cantidad: estadisticas.noLeidas },
        { id: 'por-vencer', nombre: 'Por Vencer', icono: 'time-outline', cantidad: estadisticas.porVencer },
        { id: 'vencidas', nombre: 'Vencidas', icono: 'close-circle-outline', cantidad: estadisticas.vencidas }
    ]

    return (
        <div className={estilos.contenedor}>
            {mensajeExito && (
                <div className={estilos.alertaExito}>
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <span>{mensajeExito}</span>
                </div>
            )}

            {mensajeError && (
                <div className={estilos.alertaError}>
                    <ion-icon name="alert-circle-outline"></ion-icon>
                    <span>{mensajeError}</span>
                </div>
            )}

            <div className={estilos.header}>
                <div>
                    <h1 className={estilos.titulo}>Notificaciones</h1>
                    <p className={estilos.subtitulo}>Gestiona todas las notificaciones del sistema</p>
                </div>
                <div className={estilos.headerAcciones}>
                    {estadisticas.noLeidas > 0 && (
                        <button 
                            onClick={manejarMarcarTodasLeidas}
                            className={estilos.botonSecundario}
                            disabled={procesando === 'todas'}
                        >
                            {procesando === 'todas' ? (
                                <>
                                    <ion-icon name="hourglass-outline"></ion-icon>
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <>
                                    <ion-icon name="checkmark-done-outline"></ion-icon>
                                    <span>Marcar todas como leidas</span>
                                </>
                            )}
                        </button>
                    )}
                    <button onClick={abrirModalCrear} className={estilos.botonPrincipal}>
                        <ion-icon name="add-circle-outline"></ion-icon>
                        <span>Nueva Notificacion</span>
                    </button>
                </div>
            </div>

            <div className={estilos.tarjetasEstadisticas}>
                <div className={estilos.tarjeta}>
                    <div className={estilos.tarjetaIcono} style={{ backgroundColor: '#dbeafe' }}>
                        <ion-icon name="notifications-outline" style={{ color: '#1e40af' }}></ion-icon>
                    </div>
                    <div className={estilos.tarjetaContenido}>
                        <span className={estilos.tarjetaValor}>{estadisticas.total}</span>
                        <span className={estilos.tarjetaLabel}>Total</span>
                    </div>
                </div>

                <div className={estilos.tarjeta}>
                    <div className={estilos.tarjetaIcono} style={{ backgroundColor: '#fef3c7' }}>
                        <ion-icon name="mail-unread-outline" style={{ color: '#92400e' }}></ion-icon>
                    </div>
                    <div className={estilos.tarjetaContenido}>
                        <span className={estilos.tarjetaValor}>{estadisticas.noLeidas}</span>
                        <span className={estilos.tarjetaLabel}>No Leidas</span>
                    </div>
                </div>

                <div className={estilos.tarjeta}>
                    <div className={estilos.tarjetaIcono} style={{ backgroundColor: '#fed7aa' }}>
                        <ion-icon name="time-outline" style={{ color: '#9a3412' }}></ion-icon>
                    </div>
                    <div className={estilos.tarjetaContenido}>
                        <span className={estilos.tarjetaValor}>{estadisticas.porVencer}</span>
                        <span className={estilos.tarjetaLabel}>Por Vencer</span>
                    </div>
                </div>

                <div className={estilos.tarjeta}>
                    <div className={estilos.tarjetaIcono} style={{ backgroundColor: '#fee2e2' }}>
                        <ion-icon name="close-circle-outline" style={{ color: '#991b1b' }}></ion-icon>
                    </div>
                    <div className={estilos.tarjetaContenido}>
                        <span className={estilos.tarjetaValor}>{estadisticas.vencidas}</span>
                        <span className={estilos.tarjetaLabel}>Vencidas</span>
                    </div>
                </div>
            </div>

            <div className={estilos.controles}>
                <div className={estilos.filtros}>
                    {filtros.map((filtro) => (
                        <button
                            key={filtro.id}
                            onClick={() => cambiarFiltro(filtro.id)}
                            className={`${estilos.filtroBoton} ${filtroActual === filtro.id ? estilos.filtroActivo : ''}`}
                        >
                            <ion-icon name={filtro.icono}></ion-icon>
                            <span>{filtro.nombre}</span>
                            {filtro.cantidad > 0 && (
                                <span className={estilos.badge}>{filtro.cantidad}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {cargando ? (
                <div className={estilos.cargando}>
                    <ion-icon name="hourglass-outline"></ion-icon>
                    <p>Cargando notificaciones...</p>
                </div>
            ) : (
                <div className={estilos.contenidoNotificaciones}>
                    {notificaciones.length === 0 ? (
                        <div className={estilos.vacio}>
                            <ion-icon name="notifications-off-outline"></ion-icon>
                            <p>No hay notificaciones</p>
                            <button onClick={abrirModalCrear} className={estilos.botonSecundario}>
                                Crear notificacion
                            </button>
                        </div>
                    ) : (
                        <div className={estilos.listaNotificaciones}>
                            {notificaciones.map((notificacion) => (
                                <div 
                                    key={notificacion.id}
                                    className={`${estilos.notificacion} ${!notificacion.leida ? estilos.noLeida : ''}`}
                                >
                                    <div className={`${estilos.iconoNotificacion} ${obtenerClaseTipo(notificacion.tipo)}`}>
                                        <ion-icon name={obtenerIconoTipo(notificacion.tipo)}></ion-icon>
                                    </div>
                                    
                                    <div className={estilos.contenidoNotificacion}>
                                        <div className={estilos.notificacionHeader}>
                                            <h3 className={estilos.tituloNotificacion}>{notificacion.titulo}</h3>
                                            <span className={estilos.fecha}>{formatearFecha(notificacion.fecha)}</span>
                                        </div>
                                        <p className={estilos.mensajeNotificacion}>{notificacion.mensaje}</p>
                                        {notificacion.metadata && (
                                            <div className={estilos.metadata}>
                                                {notificacion.metadata.codigoLicencia && (
                                                    <span className={estilos.metadataItem}>
                                                        <ion-icon name="key-outline"></ion-icon>
                                                        {notificacion.metadata.codigoLicencia}
                                                    </span>
                                                )}
                                                {notificacion.metadata.diasRestantes !== undefined && (
                                                    <span className={estilos.metadataItem}>
                                                        <ion-icon name="time-outline"></ion-icon>
                                                        {notificacion.metadata.diasRestantes} dias restantes
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={estilos.accionesNotificacion}>
                                        {!notificacion.leida && (
                                            <button
                                                onClick={() => manejarMarcarLeida(notificacion.id)}
                                                className={estilos.botonIcono}
                                                disabled={procesando === notificacion.id}
                                                title="Marcar como leida"
                                            >
                                                {procesando === notificacion.id ? (
                                                    <ion-icon name="hourglass-outline"></ion-icon>
                                                ) : (
                                                    <ion-icon name="checkmark-outline"></ion-icon>
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => abrirModalEliminar(notificacion)}
                                            className={estilos.botonIconoEliminar}
                                            title="Eliminar"
                                        >
                                            <ion-icon name="trash-outline"></ion-icon>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {modalCrear && (
                <div className={estilos.overlay} onClick={cerrarModales}>
                    <div className={estilos.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={estilos.modalHeader}>
                            <h2>Nueva Notificacion</h2>
                            <button onClick={cerrarModales} className={estilos.botonCerrar}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <form onSubmit={manejarCrearNotificacion} className={estilos.modalBody}>
                            {mensajeError && (
                                <div className={estilos.alerta}>
                                    <ion-icon name="alert-circle-outline"></ion-icon>
                                    <span>{mensajeError}</span>
                                </div>
                            )}
                            
                            <div className={estilos.campo}>
                                <label>Titulo</label>
                                <input
                                    type="text"
                                    value={formulario.titulo}
                                    onChange={(e) => manejarCambioFormulario('titulo', e.target.value)}
                                    placeholder="Titulo de la notificacion"
                                    className={estilos.input}
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className={estilos.campo}>
                                <label>Mensaje</label>
                                <textarea
                                    value={formulario.mensaje}
                                    onChange={(e) => manejarCambioFormulario('mensaje', e.target.value)}
                                    placeholder="Mensaje de la notificacion"
                                    className={estilos.textarea}
                                    rows={4}
                                    required
                                ></textarea>
                            </div>

                            <div className={estilos.campo}>
                                <label>Tipo</label>
                                <select
                                    value={formulario.tipo}
                                    onChange={(e) => manejarCambioFormulario('tipo', e.target.value)}
                                    className={estilos.select}
                                    required
                                >
                                    <option value="info">Informacion</option>
                                    <option value="exito">Exito</option>
                                    <option value="advertencia">Advertencia</option>
                                    <option value="error">Error</option>
                                </select>
                            </div>

                            <div className={estilos.modalFooter}>
                                <button
                                    type="button"
                                    onClick={cerrarModales}
                                    className={estilos.botonSecundario}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={estilos.botonPrincipal}
                                    disabled={procesando === 'crear'}
                                >
                                    {procesando === 'crear' ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Creando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="checkmark-outline"></ion-icon>
                                            <span>Crear Notificacion</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalEliminar && (
                <div className={estilos.overlay} onClick={cerrarModales}>
                    <div className={estilos.modalPequeno} onClick={(e) => e.stopPropagation()}>
                        <div className={estilos.modalHeader}>
                            <h2>Eliminar Notificacion</h2>
                            <button onClick={cerrarModales} className={estilos.botonCerrar}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <div className={estilos.modalBody}>
                            {mensajeError && (
                                <div className={estilos.alerta}>
                                    <ion-icon name="alert-circle-outline"></ion-icon>
                                    <span>{mensajeError}</span>
                                </div>
                            )}
                            
                            <div className={estilos.advertencia}>
                                <ion-icon name="warning-outline"></ion-icon>
                                <p>Estas seguro de eliminar esta notificacion?</p>
                                <div className={estilos.detallesEliminar}>
                                    <p><strong>Titulo:</strong> {notificacionSeleccionada?.titulo}</p>
                                    <p><strong>Tipo:</strong> {notificacionSeleccionada?.tipo}</p>
                                </div>
                                <p className={estilos.textoAdvertencia}>Esta accion no se puede deshacer</p>
                            </div>

                            <div className={estilos.modalFooter}>
                                <button
                                    type="button"
                                    onClick={cerrarModales}
                                    className={estilos.botonSecundario}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={manejarEliminarNotificacion}
                                    className={estilos.botonPeligro}
                                    disabled={procesando === 'eliminar'}
                                >
                                    {procesando === 'eliminar' ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Eliminando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="trash-outline"></ion-icon>
                                            <span>Eliminar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}