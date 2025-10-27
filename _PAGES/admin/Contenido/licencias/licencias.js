"use client"
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import estilos from './licencias.module.css'
import { 
    obtenerLicencias, 
    cambiarEstadoLicencia, 
    crearLicencia,
    editarLicencia,
    eliminarLicencia,
    obtenerUsuariosDisponibles
} from './servidor'

export default function LicenciasAdmin() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [licencias, setLicencias] = useState([])
    const [usuarios, setUsuarios] = useState([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [filtroActual, setFiltroActual] = useState('todas')
    const [procesando, setProcesando] = useState(null)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [modalEdicion, setModalEdicion] = useState(false)
    const [modalEliminar, setModalEliminar] = useState(false)
    const [licenciaSeleccionada, setLicenciaSeleccionada] = useState(null)
    const [mensajeError, setMensajeError] = useState('')
    const [mensajeExito, setMensajeExito] = useState('')
    
    const [formulario, setFormulario] = useState({
        idUsuario: '',
        tipoLicencia: 'mensual',
        deviceId: ''
    })

    useEffect(() => {
        const filtroUrl = searchParams.get('filtro') || 'todas'
        const busquedaUrl = searchParams.get('busqueda') || ''
        
        setFiltroActual(filtroUrl)
        setBusqueda(busquedaUrl)
        
        cargarDatos(filtroUrl, busquedaUrl)
    }, [searchParams])

    const cargarDatos = async (filtro, busquedaTexto) => {
        setCargando(true)
        try {
            const [resultadoLicencias, resultadoUsuarios] = await Promise.all([
                obtenerLicencias(filtro, busquedaTexto),
                obtenerUsuariosDisponibles()
            ])
            
            if (resultadoLicencias.success) {
                setLicencias(resultadoLicencias.licencias)
            }
            
            if (resultadoUsuarios.success) {
                setUsuarios(resultadoUsuarios.usuarios)
            }
        } catch (error) {
            console.log('Error al cargar datos:', error)
        } finally {
            setCargando(false)
        }
    }

    const cambiarFiltro = (nuevoFiltro) => {
        const params = new URLSearchParams()
        params.set('filtro', nuevoFiltro)
        if (busqueda) {
            params.set('busqueda', busqueda)
        }
        router.push(`/admin/licencias?${params.toString()}`)
    }

    const realizarBusqueda = (e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        params.set('filtro', filtroActual)
        if (busqueda.trim()) {
            params.set('busqueda', busqueda.trim())
        }
        router.push(`/admin/licencias?${params.toString()}`)
    }

    const limpiarBusqueda = () => {
        setBusqueda('')
        router.push(`/admin/licencias?filtro=${filtroActual}`)
    }

    const toggleEstadoLicencia = async (idLicencia, estadoActual) => {
        setProcesando(idLicencia)
        try {
            const resultado = await cambiarEstadoLicencia(idLicencia, !estadoActual)
            
            if (resultado.success) {
                mostrarMensajeExito(resultado.mensaje)
                cargarDatos(filtroActual, busqueda)
            } else {
                mostrarMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al cambiar estado:', error)
            mostrarMensajeError('Error al cambiar estado de licencia')
        } finally {
            setProcesando(null)
        }
    }

    const abrirModalCrear = () => {
        setFormulario({
            idUsuario: '',
            tipoLicencia: 'mensual',
            deviceId: ''
        })
        setMensajeError('')
        setModalAbierto(true)
    }

    const abrirModalEditar = (licencia) => {
        setLicenciaSeleccionada(licencia)
        setFormulario({
            idUsuario: licencia.idUsuario,
            tipoLicencia: licencia.tipo,
            deviceId: licencia.deviceIdUsuario || '' // Usar el device_id del usuario
        })
        setMensajeError('')
        setModalEdicion(true)
    }

    const abrirModalEliminar = (licencia) => {
        setLicenciaSeleccionada(licencia)
        setMensajeError('')
        setModalEliminar(true)
    }

    const cerrarModales = () => {
        setModalAbierto(false)
        setModalEdicion(false)
        setModalEliminar(false)
        setLicenciaSeleccionada(null)
        setMensajeError('')
    }

    const manejarCambioFormulario = (campo, valor) => {
        setFormulario(prev => ({
            ...prev,
            [campo]: valor
        }))
    }

    const validarFormulario = () => {
        if (!formulario.idUsuario) {
            setMensajeError('Debes seleccionar un usuario')
            return false
        }
        if (!formulario.tipoLicencia) {
            setMensajeError('Debes seleccionar un tipo de licencia')
            return false
        }
        return true
    }

    const manejarCrearLicencia = async (e) => {
        e.preventDefault()
        
        if (!validarFormulario()) return
        
        setProcesando('crear')
        try {
            const resultado = await crearLicencia(
                formulario.idUsuario,
                formulario.tipoLicencia,
                formulario.deviceId
            )
            
            if (resultado.success) {
                mostrarMensajeExito('Licencia creada exitosamente')
                cerrarModales()
                cargarDatos(filtroActual, busqueda)
            } else {
                setMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al crear licencia:', error)
            setMensajeError('Error al crear licencia')
        } finally {
            setProcesando(null)
        }
    }

    const manejarEditarLicencia = async (e) => {
        e.preventDefault()
        
        if (!validarFormulario()) return
        
        setProcesando('editar')
        try {
            const resultado = await editarLicencia(
                licenciaSeleccionada.id,
                licenciaSeleccionada.idUsuario,
                formulario.tipoLicencia,
                formulario.deviceId
            )
            
            if (resultado.success) {
                mostrarMensajeExito('Licencia actualizada exitosamente')
                cerrarModales()
                cargarDatos(filtroActual, busqueda)
            } else {
                setMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al editar licencia:', error)
            setMensajeError('Error al editar licencia')
        } finally {
            setProcesando(null)
        }
    }

    const manejarEliminarLicencia = async () => {
        setProcesando('eliminar')
        try {
            const resultado = await eliminarLicencia(licenciaSeleccionada.id)
            
            if (resultado.success) {
                mostrarMensajeExito('Licencia eliminada exitosamente')
                cerrarModales()
                cargarDatos(filtroActual, busqueda)
            } else {
                setMensajeError(resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al eliminar licencia:', error)
            setMensajeError('Error al eliminar licencia')
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
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const obtenerEstadoLicencia = (activa, diasRestantes) => {
        if (!activa) return { texto: 'Inactiva', clase: estilos.inactiva }
        if (diasRestantes < 0) return { texto: 'Vencida', clase: estilos.vencida }
        if (diasRestantes <= 7) return { texto: 'Por vencer', clase: estilos.porVencer }
        return { texto: 'Activa', clase: estilos.activa }
    }

    const filtros = [
        { id: 'todas', nombre: 'Todas', icono: 'list-outline' },
        { id: 'activas', nombre: 'Activas', icono: 'checkmark-circle-outline' },
        { id: 'por-vencer', nombre: 'Por Vencer', icono: 'warning-outline' },
        { id: 'vencidas', nombre: 'Vencidas', icono: 'close-circle-outline' },
        { id: 'inactivas', nombre: 'Inactivas', icono: 'pause-circle-outline' }
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
                    <h1 className={estilos.titulo}>Licencias</h1>
                    <p className={estilos.subtitulo}>Gestiona todas las licencias del sistema</p>
                </div>
                <button onClick={abrirModalCrear} className={estilos.botonPrincipal}>
                    <ion-icon name="add-circle-outline"></ion-icon>
                    <span>Nueva Licencia</span>
                </button>
            </div>

            <div className={estilos.controles}>
                <form onSubmit={realizarBusqueda} className={estilos.buscador}>
                    <ion-icon name="search-outline"></ion-icon>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por usuario, email o codigo..."
                        className={estilos.inputBusqueda}
                    />
                    {busqueda && (
                        <button
                            type="button"
                            onClick={limpiarBusqueda}
                            className={estilos.botonLimpiar}
                            aria-label="Limpiar busqueda"
                        >
                            <ion-icon name="close-outline"></ion-icon>
                        </button>
                    )}
                </form>

                <div className={estilos.filtros}>
                    {filtros.map((filtro) => (
                        <button
                            key={filtro.id}
                            onClick={() => cambiarFiltro(filtro.id)}
                            className={`${estilos.filtroBoton} ${filtroActual === filtro.id ? estilos.filtroActivo : ''}`}
                        >
                            <ion-icon name={filtro.icono}></ion-icon>
                            <span>{filtro.nombre}</span>
                        </button>
                    ))}
                </div>
            </div>

            {cargando ? (
                <div className={estilos.cargando}>
                    <ion-icon name="hourglass-outline"></ion-icon>
                    <p>Cargando licencias...</p>
                </div>
            ) : (
                <div className={estilos.contenidoTabla}>
                    {licencias.length === 0 ? (
                        <div className={estilos.vacio}>
                            <ion-icon name="document-outline"></ion-icon>
                            <p>No se encontraron licencias</p>
                            {busqueda && (
                                <button onClick={limpiarBusqueda} className={estilos.botonSecundario}>
                                    Limpiar busqueda
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={estilos.tablaWrapper}>
                            <table className={estilos.tabla}>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Device ID</th>
                                        <th>Estado</th>
                                        <th>Tipo</th>
                                        <th>Inicio</th>
                                        <th>Vencimiento</th>
                                        <th>Dias Restantes</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licencias.map((licencia) => {
                                        const estado = obtenerEstadoLicencia(licencia.activa, licencia.diasRestantes)
                                        return (
                                            <tr key={licencia.id}>
                                                <td>
                                                    <div className={estilos.usuarioCell}>
                                                        <div className={estilos.avatar}>
                                                            <ion-icon name="person-outline"></ion-icon>
                                                        </div>
                                                        <div>
                                                            <div className={estilos.nombreUsuario}>{licencia.nombreUsuario}</div>
                                                            <div className={estilos.emailUsuario}>{licencia.emailUsuario}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {licencia.deviceIdUsuario ? (
                                                        <span className={estilos.deviceId} title={licencia.deviceIdUsuario}>
                                                            {licencia.deviceIdUsuario.substring(0, 8)}...
                                                        </span>
                                                    ) : (
                                                        <span className={estilos.sinDevice}>Sin device</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`${estilos.estadoBadge} ${estado.clase}`}>
                                                        {licencia.activa ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={estilos.tipoBadge}>{licencia.tipo}</span>
                                                </td>
                                                <td>{formatearFecha(licencia.fechaInicio)}</td>
                                                <td>{formatearFecha(licencia.fechaVencimiento)}</td>
                                                <td>
                                                    <span className={estilos.diasRestantes}>
                                                        {licencia.diasRestantes < 0 ? '0' : licencia.diasRestantes} dias
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={estilos.grupoAcciones}>
                                                        <button
                                                            onClick={() => toggleEstadoLicencia(licencia.id, licencia.activa)}
                                                            className={`${estilos.botonAccion} ${licencia.activa ? estilos.botonDesactivar : estilos.botonActivar}`}
                                                            disabled={procesando === licencia.id}
                                                            title={licencia.activa ? 'Desactivar' : 'Activar'}
                                                        >
                                                            {procesando === licencia.id ? (
                                                                <ion-icon name="hourglass-outline"></ion-icon>
                                                            ) : (
                                                                <ion-icon name={licencia.activa ? "ban-outline" : "checkmark-circle-outline"}></ion-icon>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => abrirModalEditar(licencia)}
                                                            className={`${estilos.botonAccion} ${estilos.botonEditar}`}
                                                            title="Editar"
                                                        >
                                                            <ion-icon name="create-outline"></ion-icon>
                                                        </button>
                                                        <button
                                                            onClick={() => abrirModalEliminar(licencia)}
                                                            className={`${estilos.botonAccion} ${estilos.botonEliminar}`}
                                                            title="Eliminar"
                                                        >
                                                            <ion-icon name="trash-outline"></ion-icon>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {modalAbierto && (
                <div className={estilos.overlay} onClick={cerrarModales}>
                    <div className={estilos.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={estilos.modalHeader}>
                            <h2>Nueva Licencia</h2>
                            <button onClick={cerrarModales} className={estilos.botonCerrar}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <form onSubmit={manejarCrearLicencia} className={estilos.modalBody}>
                            {mensajeError && (
                                <div className={estilos.alerta}>
                                    <ion-icon name="alert-circle-outline"></ion-icon>
                                    <span>{mensajeError}</span>
                                </div>
                            )}
                            
                            <div className={estilos.campo}>
                                <label>Usuario</label>
                                <select
                                    value={formulario.idUsuario}
                                    onChange={(e) => manejarCambioFormulario('idUsuario', e.target.value)}
                                    className={estilos.select}
                                    required
                                >
                                    <option value="">Seleccionar usuario</option>
                                    {usuarios.map((usuario) => (
                                        <option key={usuario.id} value={usuario.id}>
                                            {usuario.nombre} - {usuario.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={estilos.campo}>
                                <label>Tipo de Licencia</label>
                                <select
                                    value={formulario.tipoLicencia}
                                    onChange={(e) => manejarCambioFormulario('tipoLicencia', e.target.value)}
                                    className={estilos.select}
                                    required
                                >
                                    <option value="mensual">Mensual (30 dias)</option>
                                    <option value="trimestral">Trimestral (90 dias)</option>
                                    <option value="anual">Anual (365 dias)</option>
                                </select>
                            </div>

                            <div className={estilos.campo}>
                                <label>Device ID (Opcional)</label>
                                <input
                                    type="text"
                                    value={formulario.deviceId}
                                    onChange={(e) => manejarCambioFormulario('deviceId', e.target.value)}
                                    placeholder="Ingrese Device ID"
                                    className={estilos.input}
                                />
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
                                            <span>Crear Licencia</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalEdicion && (
                <div className={estilos.overlay} onClick={cerrarModales}>
                    <div className={estilos.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={estilos.modalHeader}>
                            <h2>Editar Licencia</h2>
                            <button onClick={cerrarModales} className={estilos.botonCerrar}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <form onSubmit={manejarEditarLicencia} className={estilos.modalBody}>
                            {mensajeError && (
                                <div className={estilos.alerta}>
                                    <ion-icon name="alert-circle-outline"></ion-icon>
                                    <span>{mensajeError}</span>
                                </div>
                            )}
                            
                            <div className={estilos.campo}>
                                <label>Usuario</label>
                                <input
                                    type="text"
                                    value={licenciaSeleccionada?.nombreUsuario || ''}
                                    className={estilos.input}
                                    disabled
                                />
                                <small className={estilos.ayuda}>El usuario no se puede cambiar</small>
                            </div>

                            <div className={estilos.campo}>
                                <label>Tipo de Licencia</label>
                                <select
                                    value={formulario.tipoLicencia}
                                    onChange={(e) => manejarCambioFormulario('tipoLicencia', e.target.value)}
                                    className={estilos.select}
                                    required
                                >
                                    <option value="mensual">Mensual (30 dias)</option>
                                    <option value="trimestral">Trimestral (90 dias)</option>
                                    <option value="anual">Anual (365 dias)</option>
                                </select>
                            </div>

                            <div className={estilos.campo}>
                                <label>Device ID</label>
                                <input
                                    type="text"
                                    value={formulario.deviceId}
                                    onChange={(e) => manejarCambioFormulario('deviceId', e.target.value)}
                                    placeholder="Ingrese Device ID"
                                    className={estilos.input}
                                />
                                <small className={estilos.ayuda}>Puedes modificar el Device ID del usuario</small>
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
                                    type="button"
                                    onClick={() => {
                                        toggleEstadoLicencia(licenciaSeleccionada.id, licenciaSeleccionada.activa)
                                        cerrarModales()
                                    }}
                                    className={estilos.botonAdvertencia}
                                >
                                    {licenciaSeleccionada.activa ? (
                                        <>
                                            <ion-icon name="ban-outline"></ion-icon>
                                            <span>Desactivar</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="checkmark-circle-outline"></ion-icon>
                                            <span>Activar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    className={estilos.botonPrincipal}
                                    disabled={procesando === 'editar'}
                                >
                                    {procesando === 'editar' ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="save-outline"></ion-icon>
                                            <span>Guardar</span>
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
                            <h2>Eliminar Licencia</h2>
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
                                <p>¿Estás seguro de eliminar esta licencia?</p>
                                <div className={estilos.detallesEliminar}>
                                    <p><strong>Usuario:</strong> {licenciaSeleccionada?.nombreUsuario}</p>
                                    <p><strong>Código:</strong> {licenciaSeleccionada?.codigo}</p>
                                    <p><strong>Tipo:</strong> {licenciaSeleccionada?.tipo}</p>
                                </div>
                                <p className={estilos.textoAdvertencia}>Esta acción no se puede deshacer</p>
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
                                    onClick={manejarEliminarLicencia}
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