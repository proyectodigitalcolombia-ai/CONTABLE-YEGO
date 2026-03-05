const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const app = express();

// Configuración de Body Parser para los formularios
app.use(express.urlencoded({ extended: true }));

// --- CONEXIÓN A LA BASE DE DATOS ---
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// --- MODELO CARGAS (TABLA LOGÍSTICA EXISTENTE) ---
// Mapeamos los nombres internos del código a los nombres en MAYÚSCULAS de tu DB
const Carga = db.define('Carga', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    field: 'ID' // Corrige error "column Carga.ID does not exist"
  },
  placa: { type: DataTypes.STRING, field: 'PLACA' },
  cont: { type: DataTypes.STRING, field: 'CONTENEDOR' },
  empresa: { type: DataTypes.STRING, field: 'EMPRESA' }, 
  comercial: { type: DataTypes.STRING, field: 'COMERCIAL' },
  puerto: { type: DataTypes.STRING, field: 'PUERTO' }
}, { 
  tableName: 'Cargas', 
  timestamps: false 
});

// --- MODELO FINANZAS (TU NUEVA TABLA) ---
const Finanza = db.define('Finanza', {
  cargaId: { 
    type: DataTypes.INTEGER, 
    unique: true,
    allowNull: false
  },
  v_flete: { 
    type: DataTypes.DECIMAL(15, 2), 
    defaultValue: 0 
  },
  est_pago: { 
    type: DataTypes.STRING, 
    defaultValue: 'PENDIENTE' 
  }
}, { 
  tableName: 'Yego_Finanzas' 
});

// Relaciones
Carga.hasOne(Finanza, { foreignKey: 'cargaId' });
Finanza.belongsTo(Carga, { foreignKey: 'cargaId' });

// --- ESTILOS CSS ---
const css = `<style>
  body{background:#0f172a;color:#f1f5f9;font-family:'Segoe UI',sans-serif;padding:20px;margin:0;}
  .container{max-width:1300px;margin:auto;}
  h1{color:#3b82f6; display:flex; align-items:center; gap:10px;}
  .card{background:#1e293b;padding:20px;border-radius:12px;border-top:4px solid #3b82f6;display:inline-block;margin-bottom:20px;box-shadow:0 4px 6px -1px #000;}
  table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:12px;overflow:hidden;font-size:13px;}
  th,td{padding:12px 15px;border-bottom:1px solid #334155; text-align:left;}
  th{background:#334155;color:#94a3b8;text-transform:uppercase; font-size:11px; letter-spacing:1px;}
  tr:hover{background:#1e293b; filter: brightness(1.2);}
  .btn{background:#2563eb;color:white;padding:8px 14px;text-decoration:none;border-radius:6px;font-size:11px;font-weight:bold;transition:0.2s;}
  .btn:hover{background:#1d4ed8; transform:scale(1.05);}
  .status{padding:4px 10px;border-radius:20px;font-size:10px;font-weight:bold;text-transform:uppercase;}
  .pendiente{background:#7f1d1d; color:#fecaca;}
  .pagado{background:#065f46; color:#a7f3d0;}
  .badge-client{color:#3b82f6; font-weight:bold; background:#1e293b; border:1px solid #334155; padding:4px 8px; border-radius:6px;}
  input, select{background:#0f172a; color:white; border:1px solid #334155; padding:10px; border-radius:6px; width:100%; margin-bottom:15px;}
</style>`;

// --- RUTA PRINCIPAL (LISTADO) ---
app.get('/', async (req, res) => {
  try {
    const despachos = await Carga.findAll({ 
      include: [Finanza], 
      order: [['id', 'DESC']] 
    });
    
    // Crear registro en Finanzas si no existe para una carga
    for (let d of despachos) {
      if (!d.Finanza) {
        await Finanza.create({ cargaId: d.id });
      }
    }

    let totalCartera = 0;
    let rows = despachos.map(d => {
      const valor = parseFloat(d.Finanza?.v_flete || 0);
      totalCartera += valor;
      const estadoClase = d.Finanza?.est_pago === 'PAGADO' ? 'pagado' : 'pendiente';
      
      return `<tr>
        <td><span style="color:#64748b">#${d.id}</span></td>
        <td><b style="color:#fff">${d.placa || '---'}</b></td>
        <td>${d.cont || '---'}</td>
        <td><span class="badge-client">${d.empresa || 'SIN EMPRESA'}</span></td>
        <td>${d.comercial || '---'}</td>
        <td>${d.puerto || '---'}</td>
        <td style="color:#34d399; font-weight:bold; font-size:15px">$ ${valor.toLocaleString()}</td>
        <td><span class="status ${estadoClase}">${d.Finanza?.est_pago || 'PENDIENTE'}</span></td>
        <td><a href="/editar/${d.id}" class="btn">LIQUIDAR</a></td>
      </tr>`;
    }).join('');

    res.send(`<html><head><title>YEGO Finanzas</title>${css}</head><body>
      <div class="container">
        <h1>YEGO 💰 Finanzas</h1>
        <div class="card">
          <span style="color:#94a3b8; font-size:12px; text-transform:uppercase;">Cartera Total</span><br>
          <span style="font-size:28px; color:#34d399; font-weight:bold;">$ ${totalCartera.toLocaleString()}</span>
        </div>
        <table>
          <thead>
            <tr><th>ID</th><th>PLACA</th><th>CONTENEDOR</th><th>EMPRESA</th><th>COMERCIAL</th><th>PUERTO</th><th>VALOR FLETE</th><th>ESTADO</th><th>ACCIÓN</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </body></html>`);
  } catch (err) {
    res.status(500).send(`<h2>Error de Sincronización</h2><p>${err.message}</p>`);
  }
});

// --- RUTA EDITAR (FORMULARIO) ---
app.get('/editar/:id', async (req, res) => {
  try {
    const f = await Finanza.findOne({ 
      where: { cargaId: req.params.id }, 
      include: [Carga] 
    });
    
    res.send(`<html><head>${css}</head><body><div class="container" style="max-width:450px; margin-top:60px;">
      <div style="background:#1e293b; padding:40px; border-radius:15px; border:1px solid #3b82f6; box-shadow:0 10px 25px -5px #000;">
        <h2 style="margin-top:0;">Liquidar Servicio #${f.cargaId}</h2>
        <p style="color:#94a3b8; font-size:14px;">Cliente: <b>${f.Carga?.empresa || 'N/A'}</b><br>Placa: ${f.Carga?.placa || '---'}</p>
        <form action="/guardar/${f.cargaId}" method="POST">
          <label style="font-size:12px; color:#94a3b8;">VALOR DEL FLETE ($)</label>
          <input type="number" name="v_flete" value="${f.v_flete}" step="0.01">
          
          <label style="font-size:12px; color:#94a3b8;">ESTADO DE PAGO</label>
          <select name="est_pago">
            <option value="PENDIENTE" ${f.est_pago === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
            <option value="PAGADO" ${f.est_pago === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
          </select>
          
          <button type="submit" class="btn" style="width:100%; padding:15px; font-size:14px; margin-top:10px;">ACTUALIZAR REGISTRO</button>
          <a href="/" style="display:block; text-align:center; margin-top:20px; color:#64748b; font-size:12px; text-decoration:none;">Cancelar y volver</a>
        </form>
      </div></div></body></html>`);
  } catch (err) {
    res.redirect('/');
  }
});

// --- RUTA GUARDAR (PROCESO) ---
app.post('/guardar/:id', async (req, res) => {
  try {
    await Finanza.update(req.body, { 
      where: { cargaId: req.params.id } 
    });
    res.redirect('/');
  } catch (err) {
    res.send("Error al guardar: " + err.message);
  }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
// Sincroniza las tablas e inicia el servidor
db.sync().then(() => {
  app.listen(PORT, () => console.log(`🚀 YEGO Finanzas corriendo en puerto ${PORT}`));
});
