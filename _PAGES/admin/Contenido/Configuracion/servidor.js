"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_cambiarla'

async function verificarAdmin() {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')

    if (!token || !token.value) {
        return null
    }

    try {
        const decoded = jwt.verify(token.value, JWT_SECRET)
        if (decoded.tipo !== 'administrador') {
            return null
        }
        return decoded
    } catch (error) {
        console.log('Error al verificar token:', error)
        return null
    }
}

export async function obtenerConfiguracion() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [configs] = await db.query(`
            SELECT clave, valor
            FROM configuracion_sistema
            WHERE es_modificable = 1
        `)

        const configuracion = {}
        configs.forEach(config => {
            configuracion[config.clave] = config.valor
        })

        return {
            success: true,
            configuracion
        }

    } catch (error) {
        console.log('Error al obtener configuracion:', error)
        return {
            success: false,
            mensaje: 'Error al obtener configuracion',
            error: error.message
        }
    }
}

export async function actualizarConfiguracion(configuracion) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        for (const [clave, valor] of Object.entries(configuracion)) {
            await db.query(`
                UPDATE configuracion_sistema
                SET valor = ?, modificado_por = ?
                WHERE clave = ? AND es_modificable = 1
            `, [valor, admin.id, clave])
        }

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, detalles)
            VALUES (?, ?, ?, ?)
        `, [admin.id, 'UPDATE', 'configuracion_sistema', 'Configuracion del sistema actualizada'])

        return {
            success: true,
            mensaje: 'Configuracion actualizada exitosamente'
        }

    } catch (error) {
        console.log('Error al actualizar configuracion:', error)
        return {
            success: false,
            mensaje: 'Error al actualizar configuracion',
            error: error.message
        }
    }
}

export async function obtenerDatosEmpresa() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [empresa] = await db.query(`
            SELECT 
                nombre_empresa,
                razon_social,
                direccion,
                telefono_principal,
                telefono_secundario,
                email_contacto,
                sitio_web,
                logo_url
            FROM datos_empresa
            WHERE activo = 1
            LIMIT 1
        `)

        if (empresa.length === 0) {
            return {
                success: true,
                empresa: {
                    nombre_empresa: '',
                    razon_social: '',
                    direccion: '',
                    telefono_principal: '',
                    telefono_secundario: '',
                    email_contacto: '',
                    sitio_web: '',
                    logo_url: ''
                }
            }
        }

        return {
            success: true,
            empresa: {
                nombre_empresa: empresa[0].nombre_empresa || '',
                razon_social: empresa[0].razon_social || '',
                direccion: empresa[0].direccion || '',
                telefono_principal: empresa[0].telefono_principal || '',
                telefono_secundario: empresa[0].telefono_secundario || '',
                email_contacto: empresa[0].email_contacto || '',
                sitio_web: empresa[0].sitio_web || '',
                logo_url: empresa[0].logo_url || ''
            }
        }

    } catch (error) {
        console.log('Error al obtener datos de empresa:', error)
        return {
            success: false,
            mensaje: 'Error al obtener datos de empresa',
            error: error.message
        }
    }
}

export async function actualizarDatosEmpresa(datosEmpresa) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [empresaExistente] = await db.query(`
            SELECT id_empresa FROM datos_empresa WHERE activo = 1 LIMIT 1
        `)

        if (empresaExistente.length === 0) {
            await db.query(`
                INSERT INTO datos_empresa (
                    nombre_empresa,
                    razon_social,
                    direccion,
                    telefono_principal,
                    telefono_secundario,
                    email_contacto,
                    sitio_web,
                    logo_url,
                    activo,
                    modificado_por
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [
                datosEmpresa.nombre_empresa,
                datosEmpresa.razon_social,
                datosEmpresa.direccion,
                datosEmpresa.telefono_principal,
                datosEmpresa.telefono_secundario,
                datosEmpresa.email_contacto,
                datosEmpresa.sitio_web,
                datosEmpresa.logo_url,
                admin.id
            ])
        } else {
            await db.query(`
                UPDATE datos_empresa
                SET 
                    nombre_empresa = ?,
                    razon_social = ?,
                    direccion = ?,
                    telefono_principal = ?,
                    telefono_secundario = ?,
                    email_contacto = ?,
                    sitio_web = ?,
                    logo_url = ?,
                    modificado_por = ?
                WHERE id_empresa = ?
            `, [
                datosEmpresa.nombre_empresa,
                datosEmpresa.razon_social,
                datosEmpresa.direccion,
                datosEmpresa.telefono_principal,
                datosEmpresa.telefono_secundario,
                datosEmpresa.email_contacto,
                datosEmpresa.sitio_web,
                datosEmpresa.logo_url,
                admin.id,
                empresaExistente[0].id_empresa
            ])
        }

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, detalles)
            VALUES (?, ?, ?, ?)
        `, [admin.id, 'UPDATE', 'datos_empresa', 'Datos de empresa actualizados'])

        return {
            success: true,
            mensaje: 'Datos de empresa actualizados exitosamente'
        }

    } catch (error) {
        console.log('Error al actualizar datos de empresa:', error)
        return {
            success: false,
            mensaje: 'Error al actualizar datos de empresa',
            error: error.message
        }
    }
}