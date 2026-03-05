const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- CONEXIÓN A LA BASE DE DATOS (NODE_VERSION 20) ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: { 
    ssl: { require: true, rejectUnauthorized: false } 
  }
});

// --- MODELO CARGA (FORZANDO MAYÚSCULAS) ---
// Usamos "quoteIdentifiers: false" no es suficiente, 
// la clave es el atributo "field" en cada columna.
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: 'ID' // <--- Esto obliga a buscar "ID" en mayúsculas
  },
  oficina: { type: DataTypes.STRING, field: 'OFICINA' },
  empresa: { type: DataTypes.STRING, field: 'EMP_GEN' },
  cli: { type: DataTypes.STRING, field: 'CLI' },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  fecha: { type: DataTypes.STRING, field: 'F_D' },
  despachador: { type: DataTypes.STRING, field: 'DESP' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// --- MODELO FINANZAS (TU TABLA LOCAL) ---
const Finanza = db.define('Finanza', {
  cargaId: { type: DataTypes.INTEGER, unique: true },
  v_flete: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  est_pago: { type: DataTypes.STRING, defaultValue: 'PENDIENTE' },
  obs_fin: { type: DataTypes.TEXT }
}, { tableName: 'Yego_Finanzas' });

Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- CSS (CORREGIDO PARA EVITAR SYNTAX ERROR) ---
const estilos = `
  body{background:#0f172a;color:#f1f5f9;font-family:sans-serif;margin:0;padding:20px}
  .container{max-width:1200px;margin:auto}
  h1{color:#3b82f6;border-bottom:2px solid #1e40af;padding-bottom:10px}
  .table-container{overflow-x:auto;background:#1e293b;border-radius:12px;border:1px solid #334155;margin-top:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1e40af;color:#fff;padding:12px;text-align:left}
  td{padding:10px;border-bottom:1px solid #334155}
  .badge{padding:4px 8px;border-radius:15px;font-weight:bold;font-size:10px}
  .pend{background:#7f1d1d;color:#fecaca}
  .pago{background:#065f46;color:#a7f3d0}
  .btn{background:#2563eb;color:white;padding:6px 12px;text-decoration:none;border-radius:5px;font-size:11px;display:inline-block}
`;

// --- RUTA PRINCIPAL ---
app.get('/', async (req, res) => {
  try {
    const servicios = await Carga.findAll({ 
      include: [{ model: Finanza }], 
      order: [['id', 'DESC']] 
    });
    
    // Sincronizar registros automáticamente
    for (let s of servicios) {
      if (!s.Finanza) {
        await Finanza.findOrCreate({ where: { cargaId: s.id } });
      }
    }

    let filas = servicios.map(s => {
      const valorFlete = s.Finanza ? parseFloat(s.Finanza.v_flete) : 0;
      const estado = s.Finanza ? s.Finanza.est_pago : 'PENDIENTE';
      const claseBadge = estado === 'PAGADO' ? 'pago' : 'pend';

      return `
        <tr>
          <td>#${s.id}</td>
          <td><b>${s.placa || '---'}</b></td>
          <td>${s.cli || '---'}</td>
          <td>${s.fecha || '---'}</td>
          <td style="color:#10b981;font-weight:bold">$ ${valorFlete.toLocaleString()}</td>
          <td><span class="badge ${claseBadge}">${estado}</span></td>
          <td>${s.despachador || '---'}</td>
          <td><a href="/editar/${s.id}" class="btn">GESTIONAR</a></td>
        </tr>`;
    }).join('');

    const html = `
      <html>
        <head>
          <title>YEGO Finanzas</title>
          <style>${estilos}</style>
        </head>
        <body>
          <div class="container">
            <h1>💰 Control Contable - YEGO</h1>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>PLACA</th><th>CLIENTE</th><th>FECHA</th><th>VALOR FLETE</th><th>ESTADO</th><th>DESPACHADOR</th><th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
          </div>
        </body>
      </html>`;
    
    res.send(html);
  } catch (err) {
    res.status(500).send("<h2>Error de Base de Datos</h2><p>" + err.message + "</p>");
  }
});

// --- RUTA EDITAR ---
app.get('/editar/:id', async (req, res) => {
  try {
    const f = await Finanza.findOne({ 
      where: { cargaId: req.params.id }, 
      include: [Carga] 
    });
    
    const htmlForm = `
      <html>
        <head><style>${estilos}</style></head>
        <body>
          <div class="container" style="max-width:400px;margin-top:50px">
            <div style="background:#1e293b;padding:25px;border-radius:15px;border:1px solid #3b82f6">
              <h3>Liquidar Servicio #${f.cargaId}</h3>
              <form action="/guardar/${f.cargaId}" method="POST">
                <label>VALOR FLETE:</label><br>
                <input type="number" name="v_flete" value="${f.v_flete}" step="0.01" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:#10b981;border:1px solid #334155;border-radius:5px;font-size:18px"><br>
                
                <label>ESTADO:</label><br>
                <select name="est_pago" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">
                  <option value="PENDIENTE" ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                  <option value="PAGADO" ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
                </select><br>
                
                <label>OBSERVACIONES:</label><br>
                <textarea name="obs_fin" style="width:100%;padding:10px;margin:10px 0;background:#0f172a;color:white;border:1px solid #334155;border-radius:5px">${f.obs_fin || ''}</textarea>
                
                <button type="submit" class="btn" style="width:100%;padding:12px;margin-top:10px;cursor:pointer">GUARDAR CAMBIOS</button>
              </form>
            </div>
          </div>
        </body>
      </html>`;
    res.send(htmlForm);
  } catch (e) { res.redirect('/'); }
});

app.post('/guardar/:id', async (req, res) => {
  try {
    await Finanza.update(req.body, { where: { cargaId: req.params.id } });
    res.redirect('/');
  } catch (e) { res.send(e.message); }
});

// --- INICIALIZACIÓN ---
const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  app.listen(PORT, () => console.log('🚀 Servidor YEGO activo en puerto ' + PORT));
}).catch(err => {
  console.error('Error al conectar DB:', err);
});
