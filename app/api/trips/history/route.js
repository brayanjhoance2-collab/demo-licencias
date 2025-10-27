import { NextResponse } from 'next/server'
import db from '@/_DB/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  console.log('✅ OPTIONS /trips/history')
  return NextResponse.json({}, { headers: corsHeaders })
}

function verifyToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export async function GET(request) {
  try {
    console.log('═══════════════════════════')
    console.log('📜 GET HISTORY REQUEST')
    
    const decoded = verifyToken(request)
    if (!decoded) {
      console.log('❌ Token inválido')
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('✅ Usuario autenticado:', decoded.id)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    console.log(`🔍 Buscando últimos ${limit} viajes del usuario ${decoded.id}`)

    const connection = await db.getConnection()

    try {
      // USAR TEMPLATE LITERAL EN LUGAR DE PLACEHOLDERS PARA LIMIT
      const [viajes] = await connection.execute(
        `SELECT 
          v.id_viaje,
          v.monto,
          v.km_total,
          v.min_total,
          v.mxn_por_km,
          v.mxn_por_min,
          v.mxn_por_hora,
          v.fecha,
          v.id_grupo,
          v.num_capturas,
          g.nombre_grupo,
          a.mejor_tarifa_monto,
          a.mejor_tarifa_km,
          a.mejor_tarifa_min,
          a.mejor_tarifa_captura,
          a.mejor_km_monto,
          a.mejor_km_km,
          a.mejor_km_tarifa,
          a.mejor_km_captura,
          a.mejor_hora_monto,
          a.mejor_hora_min,
          a.mejor_hora_tarifa,
          a.mejor_hora_captura,
          a.ruta_corta_km,
          a.ruta_corta_monto,
          a.ruta_corta_min,
          a.ruta_corta_captura,
          a.ruta_larga_km,
          a.ruta_larga_monto,
          a.ruta_larga_min,
          a.ruta_larga_captura,
          a.viaje_rapido_min,
          a.viaje_rapido_monto,
          a.viaje_rapido_km,
          a.viaje_rapido_captura,
          a.viaje_lento_min,
          a.viaje_lento_monto,
          a.viaje_lento_km,
          a.viaje_lento_captura,
          a.mejor_ratio_monto,
          a.mejor_ratio_km,
          a.mejor_ratio_min,
          a.mejor_ratio_valor,
          a.mejor_ratio_captura
        FROM viajes_registrados v
        LEFT JOIN grupos_capturas g ON v.id_grupo = g.id_grupo
        LEFT JOIN analisis_detallado a ON v.id_viaje = a.id_viaje
        WHERE v.id_usuario = ?
        ORDER BY v.fecha DESC
        LIMIT ${limit}`,
        [decoded.id]
      )

      console.log(`✅ ${viajes.length} viajes encontrados`)
      console.log('═══════════════════════════')

      return NextResponse.json(
        {
          success: true,
          message: 'Historial obtenido exitosamente',
          data: viajes
        },
        { headers: corsHeaders }
      )

    } finally {
      connection.release()
    }

  } catch (error) {
    console.error('❌ Error al obtener historial:', error)
    console.log('═══════════════════════════')
    return NextResponse.json(
      { success: false, error: 'Error del servidor: ' + error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}