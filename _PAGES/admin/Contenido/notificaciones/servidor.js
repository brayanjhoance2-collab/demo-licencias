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

export async function obtenerNotificaciones(filtro = 'todas') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        let whereConditions = ['n.tipo_destinatario = ?']
        let queryParams = ['administrador']

        switch (filtro) {
            case 'no-leidas':
                whereConditions.push('n.leida = 0')
                break
            case 'por-vencer':
                whereConditions.push('n.titulo LIKE ?')
                queryParams.push('%por vencer%')
                break
            case 'vencidas':
                whereConditions.push('n.titulo LIKE ?')
                queryParams.push('%vencida%')
                break
            case 'todas':
            default:
                break
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : ''

        const query = `
            SELECT 
                n.id_notificacion,
                n.titulo,
                n.mensaje,
                n.tipo,
                n.leida,
                n.fecha_creacion,
                n.fecha_lectura
            FROM notificaciones n
            ${whereClause}
            ORDER BY n.fecha_creacion DESC
            LIMIT 100
        `

        const [notificaciones] = await db.query(query, queryParams)

        const [estadisticasResult] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas,
                SUM(CASE WHEN titulo LIKE '%por vencer%' THEN 1 ELSE 0 END) as por_vencer,
                SUM(CASE WHEN titulo LIKE '%vencida%' THEN 1 ELSE 0 END) as vencidas
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
        `)

        const estadisticas = {
            total: estadisticasResult[0].total || 0,
            noLeidas: estadisticasResult[0].no_leidas || 0,
            porVencer: estadisticasResult[0].por_vencer || 0,
            vencidas: estadisticasResult[0].vencidas || 0
        }

        const notificacionesFormateadas = notificaciones.map(n => {
            let metadata = null
            
            const codigoMatch = n.mensaje.match(/LIC-\d+-\d+/)
            const diasMatch = n.mensaje.match(/(\d+)\s+d[ií]as?/)
            
            if (codigoMatch || diasMatch) {
                metadata = {}
                if (codigoMatch) {
                    metadata.codigoLicencia = codigoMatch[0]
                }
                if (diasMatch) {
                    metadata.diasRestantes = parseInt(diasMatch[1])
                }
            }

            return {
                id: n.id_notificacion,
                titulo: n.titulo,
                mensaje: n.mensaje,
                tipo: n.tipo,
                leida: n.leida === 1,
                fecha: n.fecha_creacion,
                fechaLectura: n.fecha_lectura,
                metadata: metadata
            }
        })

        return {
            success: true,
            notificaciones: notificacionesFormateadas,
            estadisticas: estadisticas
        }

    } catch (error) {
        console.log('Error al obtener notificaciones:', error)
        return {
            success: false,
            mensaje: 'Error al obtener notificaciones',
            error: error.message
        }
    }
}

export async function marcarComoLeida(idNotificacion) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [notificacion] = await db.query(
            'SELECT id_notificacion FROM notificaciones WHERE id_notificacion = ? AND tipo_destinatario = ?',
            [idNotificacion, 'administrador']
        )

        if (notificacion.length === 0) {
            return {
                success: false,
                mensaje: 'Notificacion no encontrada'
            }
        }

        await db.query(`
            UPDATE notificaciones 
            SET leida = 1, fecha_lectura = NOW()
            WHERE id_notificacion = ?
        `, [idNotificacion])

        return {
            success: true,
            mensaje: 'Notificacion marcada como leida'
        }

    } catch (error) {
        console.log('Error al marcar como leida:', error)
        return {
            success: false,
            mensaje: 'Error al marcar como leida',
            error: error.message
        }
    }
}

export async function marcarTodasComoLeidas() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        await db.query(`
            UPDATE notificaciones 
            SET leida = 1, fecha_lectura = NOW()
            WHERE tipo_destinatario = 'administrador' AND leida = 0
        `)

        return {
            success: true,
            mensaje: 'Todas las notificaciones marcadas como leidas'
        }

    } catch (error) {
        console.log('Error al marcar todas como leidas:', error)
        return {
            success: false,
            mensaje: 'Error al marcar todas como leidas',
            error: error.message
        }
    }
}

export async function crearNotificacion(titulo, mensaje, tipo) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        if (!titulo || !mensaje) {
            return {
                success: false,
                mensaje: 'Titulo y mensaje son obligatorios'
            }
        }

        const tiposValidos = ['info', 'exito', 'advertencia', 'error']
        if (!tiposValidos.includes(tipo)) {
            return {
                success: false,
                mensaje: 'Tipo de notificacion invalido'
            }
        }

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('administrador', ?, ?, ?, ?)
        `, [admin.id, titulo, mensaje, tipo])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, detalles)
            VALUES (?, 'INSERT', 'notificaciones', ?)
        `, [admin.id, `Notificacion creada: ${titulo}`])

        return {
            success: true,
            mensaje: 'Notificacion creada exitosamente'
        }

    } catch (error) {
        console.log('Error al crear notificacion:', error)
        return {
            success: false,
            mensaje: 'Error al crear notificacion',
            error: error.message
        }
    }
}

export async function eliminarNotificacion(idNotificacion) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [notificacion] = await db.query(
            'SELECT titulo FROM notificaciones WHERE id_notificacion = ? AND tipo_destinatario = ?',
            [idNotificacion, 'administrador']
        )

        if (notificacion.length === 0) {
            return {
                success: false,
                mensaje: 'Notificacion no encontrada'
            }
        }

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, id_registro_afectado, detalles)
            VALUES (?, 'DELETE', 'notificaciones', ?, ?)
        `, [admin.id, idNotificacion, `Notificacion eliminada: ${notificacion[0].titulo}`])

        await db.query(
            'DELETE FROM notificaciones WHERE id_notificacion = ?',
            [idNotificacion]
        )

        return {
            success: true,
            mensaje: 'Notificacion eliminada exitosamente'}

    } catch (error) {
        console.log('Error al eliminar notificacion:', error)
        return {
            success: false,
            mensaje: 'Error al eliminar notificacion',
            error: error.message
        }
    }
}

export async function generarNotificacionesAutomaticas() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [licenciasPorVencer] = await db.query(`
            SELECT 
                l.id_licencia,
                l.codigo_licencia,
                l.fecha_vencimiento,
                DATEDIFF(l.fecha_vencimiento, CURDATE()) as dias_restantes,
                u.nombre_completo,
                u.email
            FROM licencias l
            INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
            WHERE l.activa = 1 
            AND DATEDIFF(l.fecha_vencimiento, CURDATE()) <= 7
            AND DATEDIFF(l.fecha_vencimiento, CURDATE()) > 0
        `)

        const [licenciasVencidas] = await db.query(`
            SELECT 
                l.id_licencia,
                l.codigo_licencia,
                l.fecha_vencimiento,
                u.nombre_completo,
                u.email
            FROM licencias l
            INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
            WHERE l.activa = 1 
            AND l.fecha_vencimiento < CURDATE()
        `)

        let notificacionesCreadas = 0

        for (const licencia of licenciasPorVencer) {
            const [existe] = await db.query(`
                SELECT id_notificacion 
                FROM notificaciones 
                WHERE tipo_destinatario = 'administrador'
                AND mensaje LIKE ?
                AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            `, [`%${licencia.codigo_licencia}%por vencer%`])

            if (existe.length === 0) {
                await db.query(`
                    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
                    VALUES ('administrador', ?, ?, ?, 'advertencia')
                `, [
                    admin.id,
                    'Licencia por vencer',
                    `La licencia ${licencia.codigo_licencia} del usuario ${licencia.nombre_completo} (${licencia.email}) vence en ${licencia.dias_restantes} dias`
                ])
                notificacionesCreadas++
            }
        }

        for (const licencia of licenciasVencidas) {
            const [existe] = await db.query(`
                SELECT id_notificacion 
                FROM notificaciones 
                WHERE tipo_destinatario = 'administrador'
                AND mensaje LIKE ?
                AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 1 DAY)
            `, [`%${licencia.codigo_licencia}%vencida%`])

            if (existe.length === 0) {
                await db.query(`
                    INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
                    VALUES ('administrador', ?, ?, ?, 'error')
                `, [
                    admin.id,
                    'Licencia vencida',
                    `La licencia ${licencia.codigo_licencia} del usuario ${licencia.nombre_completo} (${licencia.email}) ha vencido`
                ])
                notificacionesCreadas++
            }
        }

        return {
            success: true,
            mensaje: `Se generaron ${notificacionesCreadas} notificaciones automaticas`,
            porVencer: licenciasPorVencer.length,
            vencidas: licenciasVencidas.length
        }

    } catch (error) {
        console.log('Error al generar notificaciones automaticas:', error)
        return {
            success: false,
            mensaje: 'Error al generar notificaciones automaticas',
            error: error.message
        }
    }
}

export async function obtenerResumenNotificaciones() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [resumen] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas,
                SUM(CASE WHEN tipo = 'info' THEN 1 ELSE 0 END) as tipo_info,
                SUM(CASE WHEN tipo = 'exito' THEN 1 ELSE 0 END) as tipo_exito,
                SUM(CASE WHEN tipo = 'advertencia' THEN 1 ELSE 0 END) as tipo_advertencia,
                SUM(CASE WHEN tipo = 'error' THEN 1 ELSE 0 END) as tipo_error
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
        `)

        const [recientes] = await db.query(`
            SELECT 
                id_notificacion,
                titulo,
                mensaje,
                tipo,
                leida,
                fecha_creacion
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
            ORDER BY fecha_creacion DESC
            LIMIT 5
        `)

        return {
            success: true,
            resumen: {
                total: resumen[0].total || 0,
                noLeidas: resumen[0].no_leidas || 0,
                porTipo: {
                    info: resumen[0].tipo_info || 0,
                    exito: resumen[0].tipo_exito || 0,
                    advertencia: resumen[0].tipo_advertencia || 0,
                    error: resumen[0].tipo_error || 0
                }
            },
            recientes: recientes.map(n => ({
                id: n.id_notificacion,
                titulo: n.titulo,
                mensaje: n.mensaje,
                tipo: n.tipo,
                leida: n.leida === 1,
                fecha: n.fecha_creacion
            }))
        }

    } catch (error) {
        console.log('Error al obtener resumen de notificaciones:', error)
        return {
            success: false,
            mensaje: 'Error al obtener resumen',
            error: error.message
        }
    }
}

export async function limpiarNotificacionesAntiguas(diasAntiguedad = 30) {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [resultado] = await db.query(`
            DELETE FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
            AND leida = 1
            AND fecha_creacion < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [diasAntiguedad])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, detalles)
            VALUES (?, 'DELETE', 'notificaciones', ?)
        `, [admin.id, `Limpieza automatica: ${resultado.affectedRows} notificaciones eliminadas`])

        return {
            success: true,
            mensaje: `Se eliminaron ${resultado.affectedRows} notificaciones antiguas`,
            eliminadas: resultado.affectedRows
        }

    } catch (error) {
        console.log('Error al limpiar notificaciones antiguas:', error)
        return {
            success: false,
            mensaje: 'Error al limpiar notificaciones',
            error: error.message
        }
    }
}

export async function enviarNotificacionPersonalizada(idUsuario, titulo, mensaje, tipo = 'info') {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [usuario] = await db.query(
            'SELECT id_usuario, nombre_completo FROM usuarios WHERE id_usuario = ? AND activo = 1',
            [idUsuario]
        )

        if (usuario.length === 0) {
            return {
                success: false,
                mensaje: 'Usuario no encontrado o inactivo'
            }
        }

        await db.query(`
            INSERT INTO notificaciones (tipo_destinatario, id_destinatario, titulo, mensaje, tipo)
            VALUES ('usuario', ?, ?, ?, ?)
        `, [idUsuario, titulo, mensaje, tipo])

        await db.query(`
            INSERT INTO historial_administradores (id_admin, accion, tabla_afectada, detalles)
            VALUES (?, 'INSERT', 'notificaciones', ?)
        `, [admin.id, `Notificacion enviada a usuario ${usuario[0].nombre_completo}: ${titulo}`])

        return {
            success: true,
            mensaje: 'Notificacion enviada al usuario exitosamente'
        }

    } catch (error) {
        console.log('Error al enviar notificacion personalizada:', error)
        return {
            success: false,
            mensaje: 'Error al enviar notificacion',
            error: error.message
        }
    }
}

export async function obtenerEstadisticasNotificaciones() {
    try {
        const admin = await verificarAdmin()
        if (!admin) {
            return {
                success: false,
                mensaje: 'No autorizado'
            }
        }

        const [estadisticas] = await db.query(`
            SELECT 
                DATE(fecha_creacion) as fecha,
                COUNT(*) as total,
                SUM(CASE WHEN tipo = 'info' THEN 1 ELSE 0 END) as info,
                SUM(CASE WHEN tipo = 'exito' THEN 1 ELSE 0 END) as exito,
                SUM(CASE WHEN tipo = 'advertencia' THEN 1 ELSE 0 END) as advertencia,
                SUM(CASE WHEN tipo = 'error' THEN 1 ELSE 0 END) as error
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
            AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(fecha_creacion)
            ORDER BY fecha DESC
        `)

        const [totales] = await db.query(`
            SELECT 
                COUNT(*) as total_general,
                SUM(CASE WHEN leida = 1 THEN 1 ELSE 0 END) as leidas,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas,
                AVG(CASE WHEN leida = 1 THEN TIMESTAMPDIFF(MINUTE, fecha_creacion, fecha_lectura) END) as tiempo_promedio_lectura
            FROM notificaciones
            WHERE tipo_destinatario = 'administrador'
        `)

        return {
            success: true,
            estadisticas: estadisticas.map(e => ({
                fecha: e.fecha,
                total: e.total,
                porTipo: {
                    info: e.info,
                    exito: e.exito,
                    advertencia: e.advertencia,
                    error: e.error
                }
            })),
            totales: {
                totalGeneral: totales[0].total_general || 0,
                leidas: totales[0].leidas || 0,
                noLeidas: totales[0].no_leidas || 0,
                tiempoPromedioLectura: Math.round(totales[0].tiempo_promedio_lectura || 0)
            }
        }

    } catch (error) {
        console.log('Error al obtener estadisticas de notificaciones:', error)
        return {
            success: false,
            mensaje: 'Error al obtener estadisticas',
            error: error.message
        }
    }
}