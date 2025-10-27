"use client"
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import estilos from './usuarios.module.css'
import { 
    obtenerUsuarios, 
    cambiarEstadoUsuario, 
    crearLicenciaParaUsuario,
    crearUsuario,
    editarUsuario,
    eliminarUsuario
} from './servidor'

export default function UsuariosAdmin() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [usuarios, setUsuarios] = useState([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [filtroActual, setFiltroActual] = useState('todos')
    const [procesando, setProcesando] = useState(null)
    const [modalLicencia, setModalLicencia] = useState(null)
    const [tipoLicencia, setTipoLicencia] = useState('mensual')
    const [modalUsuario, setModalUsuario] = useState(null)
    const [modoModal, setModoModal] = useState('crear')
    const [modalEliminar, setModalEliminar] = useState(null)
    const [errores, setErrores] = useState({})
    const [formularioUsuario, setFormularioUsuario] = useState({
        nombre: '',
        email: '',
        telefono: '',
        password: ''
    })

    useEffect(() => {
        const filtroUrl = searchParams.get('filtro') || 'todos'
        const busquedaUrl = searchParams.get('busqueda') || ''
        
        setFiltroActual(filtroUrl)
        setBusqueda(busquedaUrl)
        
        cargarUsuarios(filtroUrl, busquedaUrl)
    }, [searchParams])

    const cargarUsuarios = async (filtro, busquedaTexto) => {
        setCargando(true)
        try {
            const resultado = await obtenerUsuarios(filtro, busquedaTexto)
            
            if (resultado.success) {
                setUsuarios(resultado.usuarios)
            }
        } catch (error) {
            console.log('Error al cargar usuarios:', error)
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
        router.push(`/admin/usuarios?${params.toString()}`)
    }

    const realizarBusqueda = (e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        params.set('filtro', filtroActual)
        if (busqueda.trim()) {
            params.set('busqueda', busqueda.trim())
        }
        router.push(`/admin/usuarios?${params.toString()}`)
    }

    const limpiarBusqueda = () => {
        setBusqueda('')
        router.push(`/admin/usuarios?filtro=${filtroActual}`)
    }

    const toggleEstadoUsuario = async (idUsuario, estadoActual) => {
        setProcesando(idUsuario)
        try {
            const resultado = await cambiarEstadoUsuario(idUsuario, !estadoActual)
            
            if (resultado.success) {
                cargarUsuarios(filtroActual, busqueda)
            }
        } catch (error) {
            console.log('Error al cambiar estado:', error)
        } finally {
            setProcesando(null)
        }
    }

    const abrirModalLicencia = (usuario) => {
        setModalLicencia(usuario)
        setTipoLicencia('mensual')
    }

    const cerrarModalLicencia = () => {
        setModalLicencia(null)
        setTipoLicencia('mensual')
    }

    const crearLicencia = async () => {
        if (!modalLicencia) return
        
        setProcesando(modalLicencia.id)
        try {
            const resultado = await crearLicenciaParaUsuario(modalLicencia.id, tipoLicencia)
            
            if (resultado.success) {
                cerrarModalLicencia()
                cargarUsuarios(filtroActual, busqueda)
            }
        } catch (error) {
            console.log('Error al crear licencia:', error)
        } finally {
            setProcesando(null)
        }
    }

    const abrirModalCrear = () => {
        setModoModal('crear')
        setFormularioUsuario({
            nombre: '',
            email: '',
            telefono: '',
            password: ''
        })
        setErrores({})
        setModalUsuario(true)
    }

    const abrirModalEditar = (usuario) => {
        setModoModal('editar')
        setFormularioUsuario({
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            telefono: usuario.telefono || '',
            password: ''
        })
        setErrores({})
        setModalUsuario(true)
    }

    const cerrarModalUsuario = () => {
        setModalUsuario(null)
        setFormularioUsuario({
            nombre: '',
            email: '',
            telefono: '',
            password: ''
        })
        setErrores({})
    }

    const validarFormulario = () => {
        const nuevosErrores = {}

        if (!formularioUsuario.nombre.trim()) {
            nuevosErrores.nombre = 'El nombre es requerido'
        }

        if (!formularioUsuario.email.trim()) {
            nuevosErrores.email = 'El email es requerido'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formularioUsuario.email)) {
            nuevosErrores.email = 'El email no es valido'
        }

        if (modoModal === 'crear' && !formularioUsuario.password) {
            nuevosErrores.password = 'La contrasena es requerida'
        }

        if (formularioUsuario.password && formularioUsuario.password.length < 6) {
            nuevosErrores.password = 'La contrasena debe tener al menos 6 caracteres'
        }

        setErrores(nuevosErrores)
        return Object.keys(nuevosErrores).length === 0
    }

    const handleSubmitUsuario = async (e) => {
        e.preventDefault()

        if (!validarFormulario()) {
            return
        }

        setProcesando('formulario')
        try {
            let resultado
            
            if (modoModal === 'crear') {
                resultado = await crearUsuario(formularioUsuario)
            } else {
                resultado = await editarUsuario(formularioUsuario)
            }

            if (resultado.success) {
                cerrarModalUsuario()
                cargarUsuarios(filtroActual, busqueda)
            } else {
                if (resultado.error && resultado.error.includes('email')) {
                    setErrores({ email: 'Este email ya esta registrado' })
                }
            }
        } catch (error) {
            console.log('Error al guardar usuario:', error)
        } finally {
            setProcesando(null)
        }
    }

    const abrirModalEliminar = (usuario) => {
        setModalEliminar(usuario)
    }

    const cerrarModalEliminar = () => {
        setModalEliminar(null)
    }

    const confirmarEliminar = async () => {
        if (!modalEliminar) return

        setProcesando(modalEliminar.id)
        try {
            const resultado = await eliminarUsuario(modalEliminar.id)

            if (resultado.success) {
                cerrarModalEliminar()
                cargarUsuarios(filtroActual, busqueda)
            }
        } catch (error) {
            console.log('Error al eliminar usuario:', error)
        } finally {
            setProcesando(null)
        }
    }

    const formatearFecha = (fecha) => {
        const date = new Date(fecha)
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const filtros = [
        { id: 'todos', nombre: 'Todos', icono: 'people-outline' },
        { id: 'activos', nombre: 'Activos', icono: 'checkmark-circle-outline' },
        { id: 'inactivos', nombre: 'Inactivos', icono: 'close-circle-outline' },
        { id: 'con-licencia', nombre: 'Con Licencia', icono: 'key-outline' },
        { id: 'sin-licencia', nombre: 'Sin Licencia', icono: 'lock-closed-outline' }
    ]

    return (
        <div className={estilos.contenedor}>
            <div className={estilos.header}>
                <div>
                    <h1 className={estilos.titulo}>Usuarios</h1>
                    <p className={estilos.subtitulo}>Gestiona todos los usuarios del sistema</p>
                </div>
                <button onClick={abrirModalCrear} className={estilos.botonCrearUsuario}>
                    <ion-icon name="add-circle-outline"></ion-icon>
                    <span>Crear Usuario</span>
                </button>
            </div>

            <div className={estilos.controles}>
                <form onSubmit={realizarBusqueda} className={estilos.buscador}>
                    <ion-icon name="search-outline"></ion-icon>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre, email o telefono..."
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
                    <p>Cargando usuarios...</p>
                </div>
            ) : (
                <div className={estilos.contenidoTabla}>
                    {usuarios.length === 0 ? (
                        <div className={estilos.vacio}>
                            <ion-icon name="people-outline"></ion-icon>
                            <p>No se encontraron usuarios</p>
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
                                        <th>Whatsapp</th>
                                        <th>Fecha Registro</th>
                                        <th>Ultima Sesion</th>
                                        <th>Licencias</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>
                                                <div className={estilos.usuarioCell}>
                                                    <div className={estilos.avatar}>
                                                        <ion-icon name="person-outline"></ion-icon>
                                                    </div>
                                                    <div>
                                                        <div className={estilos.nombreUsuario}>{usuario.nombre}</div>
                                                        <div className={estilos.emailUsuario}>{usuario.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{usuario.telefono || 'Sin Whatsapp'}</td>
                                            <td>{formatearFecha(usuario.fechaRegistro)}</td>
                                            <td>{usuario.ultimaSesion ? formatearFecha(usuario.ultimaSesion) : 'Nunca'}</td>
                                            <td>
                                                <div className={estilos.licenciasInfo}>
                                                    {usuario.tieneLicencia ? (
                                                        <>
                                                            <span className={`${estilos.estadoBadge} ${usuario.licenciaActiva ? estilos.activa : estilos.inactiva}`}>
                                                                {usuario.totalLicencias} {usuario.totalLicencias === 1 ? 'licencia' : 'licencias'}
                                                            </span>
                                                            <button
                                                                onClick={() => router.push(`/admin/licencias?busqueda=${usuario.email}`)}
                                                                className={estilos.verLicencias}
                                                            >
                                                                <ion-icon name="eye-outline"></ion-icon>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`${estilos.estadoBadge} ${estilos.sinLicencia}`}>
                                                            Sin licencia
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${estilos.estadoBadge} ${usuario.activo ? estilos.activa : estilos.inactiva}`}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={estilos.acciones}>
                                                    <button
                                                        onClick={() => abrirModalLicencia(usuario)}
                                                        className={estilos.botonCrear}
                                                        title="Crear licencia"
                                                    >
                                                        <ion-icon name="add-circle-outline"></ion-icon>
                                                        <span>Licencia</span>
                                                    </button>
                                                    <button
                                                        onClick={() => abrirModalEditar(usuario)}
                                                        className={estilos.botonEditar}
                                                        title="Editar usuario"
                                                    >
                                                        <ion-icon name="create-outline"></ion-icon>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleEstadoUsuario(usuario.id, usuario.activo)}
                                                        className={`${estilos.botonAccion} ${usuario.activo ? estilos.botonDesactivar : estilos.botonActivar}`}
                                                        disabled={procesando === usuario.id}
                                                        title={usuario.activo ? 'Desactivar' : 'Activar'}
                                                    >
                                                        {procesando === usuario.id ? (
                                                            <ion-icon name="hourglass-outline"></ion-icon>
                                                        ) : (
                                                            <ion-icon name={usuario.activo ? "ban-outline" : "checkmark-circle-outline"}></ion-icon>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => abrirModalEliminar(usuario)}
                                                        className={estilos.botonEliminar}
                                                        title="Eliminar usuario"
                                                    >
                                                        <ion-icon name="trash-outline"></ion-icon>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {modalLicencia && (
                <>
                    <div className={estilos.overlay} onClick={cerrarModalLicencia}></div>
                    <div className={estilos.modal}>
                        <div className={estilos.modalHeader}>
                            <h3 className={estilos.modalTitulo}>Crear Nueva Licencia</h3>
                            <button onClick={cerrarModalLicencia} className={estilos.botonCerrarModal}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <div className={estilos.modalBody}>
                            <div className={estilos.usuarioInfo}>
                                <div className={estilos.avatarGrande}>
                                    <ion-icon name="person-outline"></ion-icon>
                                </div>
                                <div>
                                    <div className={estilos.nombreGrande}>{modalLicencia.nombre}</div>
                                    <div className={estilos.emailGrande}>{modalLicencia.email}</div>
                                </div>
                            </div>

                            <div className={estilos.campo}>
                                <label className={estilos.label}>Tipo de Licencia</label>
                                <div className={estilos.opcionesLicencia}>
                                    <button
                                        onClick={() => setTipoLicencia('mensual')}
                                        className={`${estilos.opcionBoton} ${tipoLicencia === 'mensual' ? estilos.opcionActiva : ''}`}
                                    >
                                        <ion-icon name="calendar-outline"></ion-icon>
                                        <span>Mensual</span>
                                        <span className={estilos.duracion}>30 dias</span>
                                    </button>
                                    <button
                                        onClick={() => setTipoLicencia('trimestral')}
                                        className={`${estilos.opcionBoton} ${tipoLicencia === 'trimestral' ? estilos.opcionActiva : ''}`}
                                    >
                                        <ion-icon name="calendar-outline"></ion-icon>
                                        <span>Trimestral</span>
                                        <span className={estilos.duracion}>90 dias</span>
                                    </button>
                                    <button
                                        onClick={() => setTipoLicencia('anual')}
                                        className={`${estilos.opcionBoton} ${tipoLicencia === 'anual' ? estilos.opcionActiva : ''}`}
                                    >
                                        <ion-icon name="calendar-outline"></ion-icon>
                                        <span>Anual</span>
                                        <span className={estilos.duracion}>365 dias</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className={estilos.modalFooter}>
                            <button onClick={cerrarModalLicencia} className={estilos.botonCancelar}>
                                Cancelar
                            </button>
                            <button 
                                onClick={crearLicencia} 
                                className={estilos.botonConfirmar}
                                disabled={procesando === modalLicencia.id}
                            >
                                {procesando === modalLicencia.id ? (
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
                    </div>
                </>
            )}

            {modalUsuario && (
                <>
                    <div className={estilos.overlay} onClick={cerrarModalUsuario}></div>
                    <div className={estilos.modal}>
                        <div className={estilos.modalHeader}>
                            <h3 className={estilos.modalTitulo}>
                                {modoModal === 'crear' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                            </h3>
                            <button onClick={cerrarModalUsuario} className={estilos.botonCerrarModal}>
                                <ion-icon name="close-outline"></ion-icon>
                            </button>
                        </div>
                        <form onSubmit={handleSubmitUsuario}>
                            <div className={estilos.modalBody}>
                                <div className={estilos.campo}>
                                    <label className={estilos.label}>Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={formularioUsuario.nombre}
                                        onChange={(e) => setFormularioUsuario({...formularioUsuario, nombre: e.target.value})}
                                        className={`${estilos.input} ${errores.nombre ? estilos.inputError : ''}`}
                                        placeholder="Ingresa el nombre completo"
                                    />
                                    {errores.nombre && <span className={estilos.mensajeError}>{errores.nombre}</span>}
                                </div>

                                <div className={estilos.campo}>
                                    <label className={estilos.label}>Email</label>
                                    <input
                                        type="email"
                                        value={formularioUsuario.email}
                                        onChange={(e) => setFormularioUsuario({...formularioUsuario, email: e.target.value})}
                                        className={`${estilos.input} ${errores.email ? estilos.inputError : ''}`}
                                        placeholder="ejemplo@correo.com"
                                    />
                                    {errores.email && <span className={estilos.mensajeError}>{errores.email}</span>}
                                </div>

                                <div className={estilos.campo}>
                                    <label className={estilos.label}>Whatsapp</label>
                                    <input
                                        type="tel"
                                        value={formularioUsuario.telefono}
                                        onChange={(e) => setFormularioUsuario({...formularioUsuario, telefono: e.target.value})}
                                        className={estilos.input}
                                        placeholder="Opcional"
                                    />
                                </div>

                                <div className={estilos.campo}>
                                    <label className={estilos.label}>
                                        Contrasena {modoModal === 'editar' && '(Dejar vacio para no cambiar)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formularioUsuario.password}
                                        onChange={(e) => setFormularioUsuario({...formularioUsuario, password: e.target.value})}
                                        className={`${estilos.input} ${errores.password ? estilos.inputError : ''}`}
                                        placeholder={modoModal === 'crear' ? 'Minimo 6 caracteres' : 'Dejar vacio para mantener actual'}
                                    />
                                    {errores.password && <span className={estilos.mensajeError}>{errores.password}</span>}
                                </div>
                            </div>
                            <div className={estilos.modalFooter}>
                                <button type="button" onClick={cerrarModalUsuario} className={estilos.botonCancelar}>
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className={estilos.botonConfirmar}
                                    disabled={procesando === 'formulario'}
                                >
                                    {procesando === 'formulario' ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="checkmark-outline"></ion-icon>
                                            <span>{modoModal === 'crear' ? 'Crear Usuario' : 'Guardar Cambios'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {modalEliminar && (
                <>
                    <div className={estilos.overlay} onClick={cerrarModalEliminar}></div>
                    <div className={estilos.modalEliminar}>
                        <div className={estilos.modalHeader}>
                            <div className={estilos.iconoAdvertencia}>
                                <ion-icon name="warning-outline"></ion-icon>
                            </div>
                            <h3 className={estilos.modalTitulo}>Confirmar Eliminacion</h3>
                        </div>
                        <div className={estilos.modalBody}>
                            <p className={estilos.textoAdvertencia}>
                                Estas seguro de que deseas eliminar al usuario <strong>{modalEliminar.nombre}</strong>?
                            </p>
                            <p className={estilos.textoAdvertenciaSecundario}>
                                Esta accion eliminara permanentemente todas las licencias asociadas y no se puede deshacer.
                            </p>
                        </div>
                        <div className={estilos.modalFooter}>
                            <button onClick={cerrarModalEliminar} className={estilos.botonCancelar}>
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmarEliminar} 
                                className={estilos.botonEliminarConfirmar}
                                disabled={procesando === modalEliminar.id}
                            >
                                {procesando === modalEliminar.id ? (
                                    <>
                                        <ion-icon name="hourglass-outline"></ion-icon>
                                        <span>Eliminando...</span>
                                    </>
                                ) : (
                                    <>
                                        <ion-icon name="trash-outline"></ion-icon>
                                        <span>Eliminar Usuario</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}