"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import estilos from './configuracion.module.css'
import { obtenerConfiguracion, actualizarConfiguracion, obtenerDatosEmpresa, actualizarDatosEmpresa } from './servidor'

export default function ConfiguracionAdmin() {
    const router = useRouter()
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [seccionActiva, setSeccionActiva] = useState('sistema')
    
    const [configSistema, setConfigSistema] = useState({
        duracion_licencia_mensual: '30',
        duracion_licencia_trimestral: '90',
        duracion_licencia_anual: '365',
        notificar_vencimiento: '7',
        max_dispositivos_por_licencia: '1',
        version_app: '1.0.0',
        permitir_registro_usuarios: 'true',
        mantenimiento: 'false'
    })

    const [datosEmpresa, setDatosEmpresa] = useState({
        nombre_empresa: '',
        razon_social: '',
        direccion: '',
        telefono_principal: '',
        telefono_secundario: '',
        email_contacto: '',
        sitio_web: '',
        logo_url: ''
    })

    useEffect(() => {
        cargarDatos()
    }, [])

    const cargarDatos = async () => {
        setCargando(true)
        try {
            const [resultadoConfig, resultadoEmpresa] = await Promise.all([
                obtenerConfiguracion(),
                obtenerDatosEmpresa()
            ])

            if (resultadoConfig.success && resultadoConfig.configuracion) {
                setConfigSistema(resultadoConfig.configuracion)
            }

            if (resultadoEmpresa.success && resultadoEmpresa.empresa) {
                setDatosEmpresa(resultadoEmpresa.empresa)
            }
        } catch (error) {
            console.log('Error al cargar datos:', error)
        } finally {
            setCargando(false)
        }
    }

    const handleChangeConfigSistema = (clave, valor) => {
        setConfigSistema(prev => ({
            ...prev,
            [clave]: valor
        }))
    }

    const handleChangeDatosEmpresa = (campo, valor) => {
        setDatosEmpresa(prev => ({
            ...prev,
            [campo]: valor
        }))
    }

    const guardarConfigSistema = async () => {
        setGuardando(true)
        try {
            const resultado = await actualizarConfiguracion(configSistema)
            
            if (resultado.success) {
                alert('Configuracion guardada exitosamente')
            } else {
                alert('Error al guardar configuracion: ' + resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al guardar configuracion:', error)
            alert('Error al guardar configuracion')
        } finally {
            setGuardando(false)
        }
    }

    const guardarDatosEmpresa = async () => {
        setGuardando(true)
        try {
            const resultado = await actualizarDatosEmpresa(datosEmpresa)
            
            if (resultado.success) {
                alert('Datos de empresa guardados exitosamente')
            } else {
                alert('Error al guardar datos: ' + resultado.mensaje)
            }
        } catch (error) {
            console.log('Error al guardar datos de empresa:', error)
            alert('Error al guardar datos de empresa')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) {
        return (
            <div className={estilos.contenedor}>
                <div className={estilos.cargando}>
                    <ion-icon name="hourglass-outline"></ion-icon>
                    <p>Cargando configuracion...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={estilos.contenedor}>
            <div className={estilos.header}>
                <div>
                    <h1 className={estilos.titulo}>Configuracion</h1>
                    <p className={estilos.subtitulo}>Gestiona la configuracion del sistema</p>
                </div>
            </div>

            <div className={estilos.contenido}>
                <div className={estilos.menu}>
                    <button
                        onClick={() => setSeccionActiva('sistema')}
                        className={`${estilos.menuItem} ${seccionActiva === 'sistema' ? estilos.menuItemActivo : ''}`}
                    >
                        <ion-icon name="settings-outline"></ion-icon>
                        <span>Sistema</span>
                    </button>
                    <button
                        onClick={() => setSeccionActiva('empresa')}
                        className={`${estilos.menuItem} ${seccionActiva === 'empresa' ? estilos.menuItemActivo : ''}`}
                    >
                        <ion-icon name="business-outline"></ion-icon>
                        <span>Datos de Empresa</span>
                    </button>
                </div>

                <div className={estilos.panel}>
                    {seccionActiva === 'sistema' && (
                        <div className={estilos.seccion}>
                            <div className={estilos.seccionHeader}>
                                <h2 className={estilos.seccionTitulo}>
                                    <ion-icon name="settings-outline"></ion-icon>
                                    <span>Configuracion del Sistema</span>
                                </h2>
                            </div>

                            <div className={estilos.seccionBody}>
                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Duracion de Licencias</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Licencia Mensual (dias)</span>
                                            <span className={estilos.descripcion}>Duracion en dias de una licencia mensual</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={configSistema.duracion_licencia_mensual}
                                            onChange={(e) => handleChangeConfigSistema('duracion_licencia_mensual', e.target.value)}
                                            className={estilos.input}
                                            min="1"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Licencia Trimestral (dias)</span>
                                            <span className={estilos.descripcion}>Duracion en dias de una licencia trimestral</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={configSistema.duracion_licencia_trimestral}
                                            onChange={(e) => handleChangeConfigSistema('duracion_licencia_trimestral', e.target.value)}
                                            className={estilos.input}
                                            min="1"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Licencia Anual (dias)</span>
                                            <span className={estilos.descripcion}>Duracion en dias de una licencia anual</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={configSistema.duracion_licencia_anual}
                                            onChange={(e) => handleChangeConfigSistema('duracion_licencia_anual', e.target.value)}
                                            className={estilos.input}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className={estilos.divisor}></div>

                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Notificaciones</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Dias antes de notificar vencimiento</span>
                                            <span className={estilos.descripcion}>Cuantos dias antes de vencer enviar notificacion</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={configSistema.notificar_vencimiento}
                                            onChange={(e) => handleChangeConfigSistema('notificar_vencimiento', e.target.value)}
                                            className={estilos.input}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className={estilos.divisor}></div>

                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Licencias y Dispositivos</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Maximo dispositivos por licencia</span>
                                            <span className={estilos.descripcion}>Numero maximo de dispositivos que pueden usar una licencia</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={configSistema.max_dispositivos_por_licencia}
                                            onChange={(e) => handleChangeConfigSistema('max_dispositivos_por_licencia', e.target.value)}
                                            className={estilos.input}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className={estilos.divisor}></div>

                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Aplicacion</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Version de la aplicacion</span>
                                            <span className={estilos.descripcion}>Version actual de la aplicacion Android</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={configSistema.version_app}
                                            onChange={(e) => handleChangeConfigSistema('version_app', e.target.value)}
                                            className={estilos.input}
                                            placeholder="1.0.0"
                                        />
                                    </div>

                                    <div className={estilos.campoSwitch}>
                                        <div className={estilos.switchInfo}>
                                            <span className={estilos.switchLabel}>Permitir registro de usuarios</span>
                                            <span className={estilos.switchDescripcion}>Los usuarios pueden registrarse por si mismos</span>
                                        </div>
                                        <button
                                            onClick={() => handleChangeConfigSistema('permitir_registro_usuarios', configSistema.permitir_registro_usuarios === 'true' ? 'false' : 'true')}
                                            className={`${estilos.switch} ${configSistema.permitir_registro_usuarios === 'true' ? estilos.switchActivo : ''}`}
                                        >
                                            <div className={estilos.switchCirculo}></div>
                                        </button>
                                    </div>

                                    <div className={estilos.campoSwitch}>
                                        <div className={estilos.switchInfo}>
                                            <span className={estilos.switchLabel}>Modo mantenimiento</span>
                                            <span className={estilos.switchDescripcion}>Bloquear acceso al sistema temporalmente</span>
                                        </div>
                                        <button
                                            onClick={() => handleChangeConfigSistema('mantenimiento', configSistema.mantenimiento === 'true' ? 'false' : 'true')}
                                            className={`${estilos.switch} ${configSistema.mantenimiento === 'true' ? estilos.switchActivo : ''}`}
                                        >
                                            <div className={estilos.switchCirculo}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={estilos.seccionFooter}>
                                <button
                                    onClick={guardarConfigSistema}
                                    className={estilos.botonGuardar}
                                    disabled={guardando}
                                >
                                    {guardando ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="save-outline"></ion-icon>
                                            <span>Guardar Configuracion</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {seccionActiva === 'empresa' && (
                        <div className={estilos.seccion}>
                            <div className={estilos.seccionHeader}>
                                <h2 className={estilos.seccionTitulo}>
                                    <ion-icon name="business-outline"></ion-icon>
                                    <span>Datos de la Empresa</span>
                                </h2>
                            </div>

                            <div className={estilos.seccionBody}>
                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Informacion General</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Nombre de la Empresa</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.nombre_empresa}
                                            onChange={(e) => handleChangeDatosEmpresa('nombre_empresa', e.target.value)}
                                            className={estilos.input}
                                            placeholder="Mi Empresa S.A."
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Razon Social</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.razon_social}
                                            onChange={(e) => handleChangeDatosEmpresa('razon_social', e.target.value)}
                                            className={estilos.input}
                                            placeholder="Mi Empresa Sociedad Anonima"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Direccion</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.direccion}
                                            onChange={(e) => handleChangeDatosEmpresa('direccion', e.target.value)}
                                            className={estilos.input}
                                            placeholder="Calle 123, Ciudad, Pais"
                                        />
                                    </div>
                                </div>

                                <div className={estilos.divisor}></div>

                                <div className={estilos.grupo}>
                                    <h3 className={estilos.grupoTitulo}>Contacto</h3>
                                    
                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Telefono Principal</span>
                                            <span className={estilos.descripcion}>Este numero se usara para contacto por WhatsApp</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.telefono_principal}
                                            onChange={(e) => handleChangeDatosEmpresa('telefono_principal', e.target.value)}
                                            className={estilos.input}
                                            placeholder="+51987654321"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Telefono Secundario</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.telefono_secundario}
                                            onChange={(e) => handleChangeDatosEmpresa('telefono_secundario', e.target.value)}
                                            className={estilos.input}
                                            placeholder="+51123456789"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Email de Contacto</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={datosEmpresa.email_contacto}
                                            onChange={(e) => handleChangeDatosEmpresa('email_contacto', e.target.value)}
                                            className={estilos.input}
                                            placeholder="contacto@empresa.com"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>Sitio Web</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.sitio_web}
                                            onChange={(e) => handleChangeDatosEmpresa('sitio_web', e.target.value)}
                                            className={estilos.input}
                                            placeholder="https://www.empresa.com"
                                        />
                                    </div>

                                    <div className={estilos.campo}>
                                        <label className={estilos.label}>
                                            <span>URL del Logo</span>
                                            <span className={estilos.descripcion}>URL de la imagen del logo de la empresa</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={datosEmpresa.logo_url}
                                            onChange={(e) => handleChangeDatosEmpresa('logo_url', e.target.value)}
                                            className={estilos.input}
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={estilos.seccionFooter}>
                                <button
                                    onClick={guardarDatosEmpresa}
                                    className={estilos.botonGuardar}
                                    disabled={guardando}
                                >
                                    {guardando ? (
                                        <>
                                            <ion-icon name="hourglass-outline"></ion-icon>
                                            <span>Guardando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ion-icon name="save-outline"></ion-icon>
                                            <span>Guardar Datos</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}