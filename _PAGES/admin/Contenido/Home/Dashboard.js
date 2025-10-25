"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import estilos from './Dashboard.module.css'
import { obtenerEstadisticasDashboard, obtenerLicenciasRecientes, obtenerUsuariosRecientes } from './servidor'

export default function Dashboard() {
    const router = useRouter()
    const [estadisticas, setEstadisticas] = useState(null)
    const [licenciasRecientes, setLicenciasRecientes] = useState([])
    const [usuariosRecientes, setUsuariosRecientes] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
        try {
            const [resultadoEstadisticas, resultadoLicencias, resultadoUsuarios] = await Promise.all([
                obtenerEstadisticasDashboard(),
                obtenerLicenciasRecientes(),
                obtenerUsuariosRecientes()
            ])

            if (resultadoEstadisticas.success) {
                setEstadisticas(resultadoEstadisticas.estadisticas)
            }

            if (resultadoLicencias.success) {
                setLicenciasRecientes(resultadoLicencias.licencias)
            }

            if (resultadoUsuarios.success) {
                setUsuariosRecientes(resultadoUsuarios.usuarios)
            }

            setCargando(false)
        } catch (error) {
            console.log('Error al cargar datos del dashboard:', error)
            setCargando(false)
        }
    }

    const navegarA = (ruta) => {
        router.push(ruta)
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

    if (cargando) {
        return (
            <div className={estilos.contenedor}>
                <div className={estilos.cargando}>
                    <ion-icon name="hourglass-outline"></ion-icon>
                    <p>Cargando dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={estilos.contenedor}>
            <div className={estilos.header}>
                <div>
                    <h1 className={estilos.titulo}>Dashboard</h1>
                    <p className={estilos.subtitulo}>Resumen general del sistema</p>
                </div>
            </div>

            <div className={estilos.estadisticas}>
                <div className={estilos.tarjetaEstadistica}>
                    <div className={estilos.iconoWrapper} style={{ backgroundColor: '#3b82f6' }}>
                        <ion-icon name="people-outline"></ion-icon>
                    </div>
                    <div className={estilos.estadisticaInfo}>
                        <span className={estilos.estadisticaValor}>{estadisticas?.totalUsuarios || 0}</span>
                        <span className={estilos.estadisticaLabel}>Usuarios Activos</span>
                    </div>
                    <button onClick={() => navegarA('/admin/usuarios')} className={estilos.verMas}>
                        <span>Ver todos</span>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>

                <div className={estilos.tarjetaEstadistica}>
                    <div className={estilos.iconoWrapper} style={{ backgroundColor: '#10b981' }}>
                        <ion-icon name="key-outline"></ion-icon>
                    </div>
                    <div className={estilos.estadisticaInfo}>
                        <span className={estilos.estadisticaValor}>{estadisticas?.licenciasActivas || 0}</span>
                        <span className={estilos.estadisticaLabel}>Licencias Activas</span>
                    </div>
                    <button onClick={() => navegarA('/admin/licencias?filtro=activas')} className={estilos.verMas}>
                        <span>Ver todas</span>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>

                <div className={estilos.tarjetaEstadistica}>
                    <div className={estilos.iconoWrapper} style={{ backgroundColor: '#f59e0b' }}>
                        <ion-icon name="warning-outline"></ion-icon>
                    </div>
                    <div className={estilos.estadisticaInfo}>
                        <span className={estilos.estadisticaValor}>{estadisticas?.licenciasPorVencer || 0}</span>
                        <span className={estilos.estadisticaLabel}>Por Vencer</span>
                    </div>
                    <button onClick={() => navegarA('/admin/licencias?filtro=por-vencer')} className={estilos.verMas}>
                        <span>Ver detalles</span>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>

                <div className={estilos.tarjetaEstadistica}>
                    <div className={estilos.iconoWrapper} style={{ backgroundColor: '#ef4444' }}>
                        <ion-icon name="close-circle-outline"></ion-icon>
                    </div>
                    <div className={estilos.estadisticaInfo}>
                        <span className={estilos.estadisticaValor}>{estadisticas?.licenciasVencidas || 0}</span>
                        <span className={estilos.estadisticaLabel}>Licencias Vencidas</span>
                    </div>
                    <button onClick={() => navegarA('/admin/licencias?filtro=vencidas')} className={estilos.verMas}>
                        <span>Ver detalles</span>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                    </button>
                </div>
            </div>

            <div className={estilos.contenido}>
                <div className={estilos.seccion}>
                    <div className={estilos.seccionHeader}>
                        <h2 className={estilos.seccionTitulo}>
                            <ion-icon name="key-outline"></ion-icon>
                            <span>Licencias Recientes</span>
                        </h2>
                        <button onClick={() => navegarA('/admin/licencias')} className={estilos.botonSecundario}>
                            Ver todas
                        </button>
                    </div>

                    <div className={estilos.tabla}>
                        {licenciasRecientes.length === 0 ? (
                            <div className={estilos.vacio}>
                                <ion-icon name="file-tray-outline"></ion-icon>
                                <p>No hay licencias registradas</p>
                            </div>
                        ) : (
                            <table className={estilos.tablaContenido}>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Codigo</th>
                                        <th>Tipo</th>
                                        <th>Vencimiento</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licenciasRecientes.map((licencia) => {
                                        const estado = obtenerEstadoLicencia(licencia.activa, licencia.diasRestantes)
                                        return (
                                            <tr key={licencia.id}>
                                                <td>
                                                    <div className={estilos.usuarioCell}>
                                                        <div className={estilos.avatarTabla}>
                                                            <ion-icon name="person-outline"></ion-icon>
                                                        </div>
                                                        <div>
                                                            <div className={estilos.nombreUsuario}>{licencia.nombreUsuario}</div>
                                                            <div className={estilos.emailUsuario}>{licencia.emailUsuario}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={estilos.codigoCell}>{licencia.codigo}</td>
                                                <td>
                                                    <span className={estilos.tipoBadge}>{licencia.tipo}</span>
                                                </td>
                                                <td>{formatearFecha(licencia.fechaVencimiento)}</td>
                                                <td>
                                                    <span className={`${estilos.estadoBadge} ${estado.clase}`}>
                                                        {estado.texto}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className={estilos.seccion}>
                    <div className={estilos.seccionHeader}>
                        <h2 className={estilos.seccionTitulo}>
                            <ion-icon name="people-outline"></ion-icon>
                            <span>Usuarios Recientes</span>
                        </h2>
                        <button onClick={() => navegarA('/admin/usuarios')} className={estilos.botonSecundario}>
                            Ver todos
                        </button>
                    </div>

                    <div className={estilos.tabla}>
                        {usuariosRecientes.length === 0 ? (
                            <div className={estilos.vacio}>
                                <ion-icon name="people-outline"></ion-icon>
                                <p>No hay usuarios registrados</p>
                            </div>
                        ) : (
                            <table className={estilos.tablaContenido}>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Telefono</th>
                                        <th>Fecha Registro</th>
                                        <th>Licencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuariosRecientes.map((usuario) => (
                                        <tr key={usuario.id}>
                                            <td>
                                                <div className={estilos.usuarioCell}>
                                                    <div className={estilos.avatarTabla}>
                                                        <ion-icon name="person-outline"></ion-icon>
                                                    </div>
                                                    <div>
                                                        <div className={estilos.nombreUsuario}>{usuario.nombre}</div>
                                                        <div className={estilos.emailUsuario}>{usuario.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{usuario.telefono || 'Sin telefono'}</td>
                                            <td>{formatearFecha(usuario.fechaRegistro)}</td>
                                            <td>
                                                {usuario.tieneLicencia ? (
                                                    <span className={`${estilos.estadoBadge} ${estilos.activa}`}>
                                                        Con licencia
                                                    </span>
                                                ) : (
                                                    <span className={`${estilos.estadoBadge} ${estilos.inactiva}`}>
                                                        Sin licencia
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}