"use server"
import db from "@/_DB/db"
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

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

export async function obtenerUsuarios(filtro = 'todos', busqueda = '') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        let whereConditions = []
        let queryParams = []

        if (busqueda && busqueda.trim() !== '') {
            whereConditions.push(`(
                u.nombre_completo LIKE ? OR 
                u.email LIKE ? OR 
                u.telefono LIKE ?
            )`)
            const searchTerm = `%${busqueda.trim()}%`
            queryParams.push(searchTerm, searchTerm, searchTerm)
        }

        switch (filtro) {
            case 'activos':
                whereConditions.push('u.activo = 1')
                break
            case 'inactivos':
                whereConditions.push('u.activo = 0')
                break
            case 'con-licencia':
                whereConditions.push('licencias_count > 0')
                break
            case 'sin-licencia':
                whereConditions.push('licencias_count = 0')
                break
            case 'todos':
            default:
                break
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : ''

        const finalQuery = `
            SELECT 
                u.id_usuario,
                u.nombre_completo,
                u.email,
                u.telefono,
                u.activo,
                u.fecha_registro,
                u.ultima_sesion,
                COUNT(l.id_licencia) as total_licencias,
                MAX(l.activa) as tiene_licencia_activa
            FROM usuarios u
            LEFT JOIN licencias l ON u.id_usuario = l.id_usuario
            ${whereClause.replace('licencias_count', 'COUNT(l.id_licencia)')}
            GROUP BY u.id_usuario
            ORDER BY u.fecha_registro DESC
        `

        const [usuarios] = await db.query(finalQuery, queryParams)

        return {
            success: true,
            usuarios: usuarios.map(u => ({
                id: u.id_usuario,
                nombre: u.nombre_completo,
                email: u.email,
                telefono: u.telefono,
                activo: u.activo === 1,
                fechaRegistro: u.fecha_registro,
                ultimaSesion: u.ultima_sesion,
                totalLicencias: u.total_licencias,
                tieneLicencia: u.total_licencias > 0,
                licenciaActiva: u.tiene_licencia_activa === 1
            }))
        }

    } catch (error) {
        console.log('Error al obtener usuarios:', error)
        return {
            success: false,
            mensaje: 'Error al obtener usuarios',
            error: error.message
        }
    }
}

export async function cambiarEstadoUsuario(idUsuario, nuevoEstado) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        await db.query(`
            UPDATE usuarios 
            SET activo = ?
            WHERE id_usuario = ?
        `, [nuevoEstado ? 1 : 0, idUsuario])

        const accion = nuevoEstado ? 'activado' : 'desactivado'
        
        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, ?, ?, ?, ?)
        `, [admin.id, 'UPDATE', 'usuarios', idUsuario, `Usuario ${accion}`])

        const mensaje = nuevoEstado 
            ? 'Tu cuenta ha sido activada por el administrador' 
            : 'Tu cuenta ha sido desactivada por el administrador'
        
        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Estado de cuenta', ?, ?)
        `, [idUsuario, mensaje, nuevoEstado ? 'exito' : 'advertencia'])

        return {
            success: true,
            mensaje: `Usuario ${accion} exitosamente`
        }

    } catch (error) {
        console.log('Error al cambiar estado de usuario:', error)
        return {
            success: false,
            mensaje: 'Error al cambiar estado de usuario',
            error: error.message
        }
    }
}

export async function crearLicenciaParaUsuario(idUsuario, tipoLicencia) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuario] = await db.query(`
            SELECT nombre_completo, email FROM usuarios WHERE id_usuario = ?
        `, [idUsuario])

        if (usuario.length === 0) {
            return {
                success: false,
                mensaje: 'Usuario no encontrado'
            }
        }

        const [configDuracion] = await db.query(`
            SELECT valor FROM configuracion_sistema 
            WHERE clave = ?
        `, [`duracion_licencia_${tipoLicencia}`])

        const duracion = configDuracion.length > 0 ? parseInt(configDuracion[0].valor) : 30

        const codigoLicencia = `LIC-${String(idUsuario).padStart(5, '0')}-${Date.now()}`
        const fechaInicio = new Date()
        const fechaVencimiento = new Date()
        fechaVencimiento.setDate(fechaVencimiento.getDate() + duracion)

        const [resultadoLicencia] = await db.query(`
            INSERT INTO licencias (
                id_usuario,
                codigo_licencia,
                fecha_inicio,
                fecha_vencimiento,
                tipo_licencia,
                activa,
                modificado_por,
                fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        `, [
            idUsuario,
            codigoLicencia,
            fechaInicio,
            fechaVencimiento,
            tipoLicencia,
            admin.id
        ])

        const idLicencia = resultadoLicencia.insertId

        await db.query(`
            INSERT INTO historial_licencias (id_licencia, accion, id_admin_modificador, notas)
            VALUES (?, 'creada', ?, ?)
        `, [idLicencia, admin.id, `Licencia ${tipoLicencia} creada por el administrador`])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, ?, ?, ?, ?)
        `, [admin.id, 'CREATE', 'licencias', idLicencia, `Licencia ${tipoLicencia} creada para ${usuario[0].nombre_completo}`])

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Nueva licencia', ?, 'exito')
        `, [idUsuario, `Se te ha asignado una licencia ${tipoLicencia}. Codigo: ${codigoLicencia}`])

        return {
            success: true,
            mensaje: 'Licencia creada exitosamente',
            licencia: {
                id: idLicencia,
                codigo: codigoLicencia,
                tipo: tipoLicencia,
                fechaVencimiento: fechaVencimiento
            }
        }

    } catch (error) {
        console.log('Error al crear licencia:', error)
        return {
            success: false,
            mensaje: 'Error al crear licencia',
            error: error.message
        }
    }
}

export async function crearUsuario(datos) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const { nombre, email, telefono, password } = datos

        if (!nombre || !email || !password) {
            return {
                success: false,
                mensaje: 'Todos los campos obligatorios deben estar completos'
            }
        }

        const [usuarioExistente] = await db.query(`
            SELECT id_usuario FROM usuarios WHERE email = ?
        `, [email])

        if (usuarioExistente.length > 0) {
            return {
                success: false,
                mensaje: 'El email ya esta registrado',
                error: 'email duplicado'
            }
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const [resultado] = await db.query(`
            INSERT INTO usuarios (
                nombre_completo,
                email,
                telefono,
                password_hash,
                activo,
                fecha_registro
            ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [nombre, email, telefono || null, passwordHash])

        const idUsuario = resultado.insertId

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, ?, ?, ?, ?)
        `, [admin.id, 'CREATE', 'usuarios', idUsuario, `Usuario creado: ${nombre}`])

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Bienvenido', 'Tu cuenta ha sido creada exitosamente', 'exito')
        `, [idUsuario])

        return {
            success: true,
            mensaje: 'Usuario creado exitosamente',
            usuario: {
                id: idUsuario,
                nombre,
                email
            }
        }

    } catch (error) {
        console.log('Error al crear usuario:', error)
        return {
            success: false,
            mensaje: 'Error al crear usuario',
            error: error.message
        }
    }
}

export async function editarUsuario(datos) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const { id, nombre, email, telefono, password } = datos

        if (!id || !nombre || !email) {
            return {
                success: false,
                mensaje: 'Los campos obligatorios deben estar completos'
            }
        }

        const [usuarioExistente] = await db.query(`
            SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?
        `, [email, id])

        if (usuarioExistente.length > 0) {
            return {
                success: false,
                mensaje: 'El email ya esta siendo usado por otro usuario',
                error: 'email duplicado'
            }
        }

        if (password && password.trim() !== '') {
            const passwordHash = await bcrypt.hash(password, 10)
            
            await db.query(`
                UPDATE usuarios 
                SET nombre_completo = ?,
                    email = ?,
                    telefono = ?,
                    password_hash = ?
                WHERE id_usuario = ?
            `, [nombre, email, telefono || null, passwordHash, id])
        } else {
            await db.query(`
                UPDATE usuarios 
                SET nombre_completo = ?,
                    email = ?,
                    telefono = ?
                WHERE id_usuario = ?
            `, [nombre, email, telefono || null, id])
        }

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, ?, ?, ?, ?)
        `, [admin.id, 'UPDATE', 'usuarios', id, `Usuario editado: ${nombre}`])

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, 'Datos actualizados', 'Tus datos han sido actualizados por el administrador', 'info')
        `, [id])

        return {
            success: true,
            mensaje: 'Usuario actualizado exitosamente'
        }

    } catch (error) {
        console.log('Error al editar usuario:', error)
        return {
            success: false,
            mensaje: 'Error al editar usuario',
            error: error.message
        }
    }
}

export async function eliminarUsuario(idUsuario) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuario] = await db.query(`
            SELECT nombre_completo, email FROM usuarios WHERE id_usuario = ?
        `, [idUsuario])

        if (usuario.length === 0) {
            return {
                success: false,
                mensaje: 'Usuario no encontrado'
            }
        }

        await db.query(`
            DELETE FROM usuarios WHERE id_usuario = ?
        `, [idUsuario])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, ?, ?, ?, ?)
        `, [admin.id, 'DELETE', 'usuarios', idUsuario, `Usuario eliminado: ${usuario[0].nombre_completo}`])

        return {
            success: true,
            mensaje: 'Usuario eliminado exitosamente'
        }

    } catch (error) {
        console.log('Error al eliminar usuario:', error)
        return {
            success: false,
            mensaje: 'Error al eliminar usuario',
            error: error.message
        }
    }
}