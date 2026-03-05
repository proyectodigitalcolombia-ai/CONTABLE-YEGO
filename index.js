const express = require('express');
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

// Forzamos el modelo a usar minúsculas exactas para evitar el error de las imágenes
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true, field: 'cargaid' },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'v_flete' },
  v_facturar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'v_facturar' },
  saldo_a_pagar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'saldo_a_pagar' },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE', field: 'est_pago' }
}, { tableName: 'Yego_Finanzas', timestamps: false });

// Función para encontrar la columna de fecha sin importar cómo se llame
const extraerFecha = (obj) => {
  return obj.f_doc || obj.fdoc || obj.fecha || obj.createdat || obj.createdAt || '---';
};

app.get('/', async (req, res) => {
  try {
    // Usamos comillas dobles en el SQL para asegurar que Postgres encuentre las minúsculas
    const sql = `
      SELECT c.*, f.*, c.id AS main_id 
      FROM "Cargas" c
      LEFT JOIN "Yego_Finanzas" f ON CAST(c.id AS TEXT) = CAST(f."cargaid" AS TEXT)
      WHERE c.placa IS NOT NULL AND c.placa != '' 
      ORDER BY c.id DESC LIMIT 150`;
    
    const datos = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;
    let filas = datos.map(c => {
      // Normalizamos la lectura de datos
      const fleteP = parseFloat(c.v_flete || 0);
      const fleteF = parseFloat(c.v_facturar || 0);
      const saldo = parseFloat(c.saldo_a_pagar || 0);
      const fechaCarga = extraerFecha(c);

      if ((c.est_pago || 'PENDIENTE') === 'PENDIENTE') totalPendiente += fleteP;

      const tdStyle = `padding: 10px; text-align: center; border-right: 1px solid #334155; white-space: nowrap;`;

      return `
        <tr style="border-bottom: 1px solid #334155; font-size: 11px;">
          <td style="${tdStyle} color: #94a3b8;">#${c.main_id}</td>
          <td style="${tdStyle}">${fechaCarga}</td>
          <td style="${tdStyle}">${c.oficina || '---'}</td>
          <td style="${tdStyle}">${c.orig || '---'}</td>
          <td style="${tdStyle}">${c.dest || '---'}</td>
          <td style="${tdStyle}">${c.cli || '---'}</td>
          <td style="${tdStyle} background: rgba(59, 130, 246, 0.1); font-weight: bold;">${c.placa || '---'}</td>
          <td style="${tdStyle} color: #10b981; font-weight: bold;">$${fleteP.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} color: #3b82f6;">$${fleteF.toLocaleString('es-CO')}</td>
          <td style="${tdStyle} background: rgba(16, 185, 129, 0.1); font-weight: bold; color: #10b981;">$${saldo.toLocaleString('es-CO')}</td>
          <td style="padding: 10px; text-align: center;">
            <a href="/editar/${c.main_id}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">[LIQUIDAR]</a>
          </td>
        </tr>`;
    }).join('');

    res.send(`
      <body style="background:#0f172a; color:#f1f5f9; font-family: sans-serif; padding:15px; margin:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
          <h2 style="margin:0; color: #3b82f6;">YEGO SISTEMA CONTABLE</h2>
          <div style="text-align: right; background: rgba(239, 68, 68, 0.1); padding: 5px 15px; border-radius: 6px; border: 1px solid #ef4444;">
            <small style="color:#ef4444; font-weight: bold;">TOTAL PENDIENTE:</small><br>
            <b style="color:#f1f5f9; font-size: 20px;">$ ${totalPendiente.toLocaleString('es-CO')}</b>
          </div>
        </div>
        <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #334155;">
          <table style="width:100%; border-collapse:collapse; background:#1e293b;">
            <thead style="background:#1e40af; color: white; font-size: 11px;">
              <tr>
                <th style="padding:12px;">ID</th><th style="padding:12px;">FECHA REGISTRO</th>
                <th style="padding:12px;">OFICINA</th><th style="padding:12px;">ORIGEN</th>
                <th style="padding:12px;">DESTINO</th><th style="padding:12px;">CLIENTE</th>
                <th style="padding:12px;">PLACA</th><th style="padding:12px;">FLETE PAGAR</th>
                <th style="padding:12px;">FLETE FACTURAR</th><th style="padding:12px;">SALDO FINAL</th>
                <th style="padding:12px;">ACCIÓN</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </body>`);
  } catch (err) { 
    res.status(500).send(`<h3>Error de Base de Datos</h3><p>${err.message}</p>`); 
  }
});

app.get('/editar/:id', async (req, res) => {
  // findOrCreate usa cargaid en minúsculas para coincidir con la base de datos
  const [f] = await Finanza.findOrCreate({ where: { cargaId: req.params.id } });
  res.send(`
    <body style="background:#0f172a; color:#f1f5f9; font-family:sans-serif; padding: 40px;">
      <div style="max-width:500px; margin:auto; background:#1e293b; padding:30px; border-radius:12px; border:1px solid #3b82f6;">
        <h2 style="color:#3b82f6; text-align: center;">Liquidar Carga #${req.params.id}</h2>
        <form action="/guardar/${req.params.id}" method="POST" style="display: flex; flex-direction: column; gap: 15px;">
          <label>Flete a Pagar:</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="padding:10px; background:#0f172a; color:white; border:1px solid #334155;">
          <label>Flete a Facturar:</label>
          <input type="number" name="v_facturar" value="${f.v_facturar}" step="0.01" style="padding:10px; background:#0f172a; color:white; border:1px solid #334155;">
          <label>Saldo a Pagar:</label>
          <input type="number" name="saldo_a_pagar" value="${f.saldo_a_pagar}" step="0.01" style="padding:10px; background:#0f172a; color:#10b981; border:1px solid #10b981;">
          <button type="submit" style="padding:15px; background:#3b82f6; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">GUARDAR CAMBIOS</button>
        </form>
        <p style="text-align:center;"><a href="/" style="color:#94a3b8; text-decoration:none;">← Volver</a></p>
      </div>
    </body>`);
});

app.post('/guardar/:id', async (req, res) => {
  try {
    await Finanza.upsert({
      cargaId: req.params.id,
      v_flete: req.body.v_flete,
      v_facturar: req.body.v_facturar,
      saldo_a_pagar: req.body.saldo_a_pagar
    });
    res.redirect('/');
  } catch (err) { res.status(500).send("Error al guardar: " + err.message); }
});

const PORT = process.env.PORT || 3000;
db.sync().then(() => app.listen(PORT, () => console.log('🚀 Sistema Yego Corregido')));
