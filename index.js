app.get('/', async (req, res) => {
  try {

    const sql = `
    SELECT 
      c.*,
      f."v_flete",
      f."v_facturar",
      f."est_pago",
      f."tipo_anticipo",
      f."valor_anticipo",
      f."sobre_anticipo",
      f."estado_ant",
      f."fecha_pago_ant",
      f."tipo_cumplido",
      f."fecha_cump_virtual",
      f."ent_manifiesto",
      f."ent_remesa",
      f."ent_hoja_tiempos",
      f."ent_docs_cliente",
      f."ent_facturas",
      f."ent_tirilla_vacio",
      f."ent_tiq_cargue",
      f."ent_tiq_descargue",
      f."presenta_novedades",
      f."obs_novedad",
      f."valor_descuento",
      f."fecha_cump_docs",
      f."fecha_legalizacion",
      f."retefuente",
      f."reteica",
      f."saldo_a_pagar",
      f."estado_final",
      f."dias_sin_pagar",
      f."dias_sin_cumplir"
    FROM "Cargas" c
    LEFT JOIN "Yego_Finanzas" f
    ON f."cargaId" = c.id
    WHERE c.placa IS NOT NULL
    AND c.placa != ''
    ORDER BY c.id DESC
    LIMIT 150
    `;

    const cargas = await db.query(sql, { type: QueryTypes.SELECT });

    let totalPendiente = 0;

    let filas = cargas.map(c => {

      const fletePagar = Number(c.v_flete || 0);
      const estadoContable = c.est_pago || "PENDIENTE";

      if (estadoContable === 'PENDIENTE') {
        totalPendiente += fletePagar;
      }

      const statusCheck = (val) => {
        if (val === 'SI') return '<span style="color:#10b981;">✅ SI</span>';
        if (val === 'NO') return '<span style="color:#ef4444;">❌ NO</span>';
        return val || '---';
      };

      const tdStyle = `
      padding:10px;
      text-align:center;
      border-right:1px solid #334155;
      white-space:nowrap;
      `;

      return `
      <tr class="fila-carga" data-placa="${(c.placa || '').toLowerCase()}" 
      style="border-bottom:1px solid #334155;font-size:11px;">

      <td style="${tdStyle} color:#94a3b8;">#${c.id}</td>
      <td style="${tdStyle}">${c.f_doc || '---'}</td>
      <td style="${tdStyle}">${c.oficina || '---'}</td>
      <td style="${tdStyle}">${c.orig || '---'}</td>
      <td style="${tdStyle}">${c.dest || '---'}</td>
      <td style="${tdStyle}">${c.cli || '---'}</td>
      <td style="${tdStyle}">${c.cont || '---'}</td>
      <td style="${tdStyle}">${c.ped || '---'}</td>

      <td style="${tdStyle} background:rgba(59,130,246,0.1);font-weight:bold;">
      ${c.placa}
      </td>

      <td style="${tdStyle}">${c.muc || '---'}</td>

      <td style="${tdStyle} color:#10b981;font-weight:bold;">
      $${fletePagar.toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle} color:#3b82f6;">
      $${Number(c.v_facturar || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">${c.f_act || '---'}</td>

      <td style="${tdStyle} color:#fbbf24;">
      ${c.est_real || '---'}
      </td>

      <td style="${tdStyle}">${c.tipo_anticipo || '---'}</td>

      <td style="${tdStyle}">
      $${Number(c.valor_anticipo || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">
      $${Number(c.sobre_anticipo || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">${c.estado_ant || '---'}</td>

      <td style="${tdStyle}">${c.fecha_pago_ant || '---'}</td>

      <td style="${tdStyle}">${c.tipo_cumplido || '---'}</td>

      <td style="${tdStyle}">${c.fecha_cump_virtual || '---'}</td>

      <td style="${tdStyle}">${statusCheck(c.ent_manifiesto)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_remesa)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_hoja_tiempos)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_docs_cliente)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_facturas)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_tirilla_vacio)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_tiq_cargue)}</td>
      <td style="${tdStyle}">${statusCheck(c.ent_tiq_descargue)}</td>
      <td style="${tdStyle}">${statusCheck(c.presenta_novedades)}</td>

      <td style="${tdStyle}">${c.obs_novedad || '---'}</td>

      <td style="${tdStyle} color:#ef4444;">
      $${Number(c.valor_descuento || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">${c.fecha_cump_docs || '---'}</td>
      <td style="${tdStyle}">${c.fecha_legalizacion || '---'}</td>

      <td style="${tdStyle}">
      $${Number(c.retefuente || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">
      $${Number(c.reteica || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle} background:rgba(16,185,129,0.1);
      font-weight:bold;color:#10b981;">
      $${Number(c.saldo_a_pagar || 0).toLocaleString('es-CO')}
      </td>

      <td style="${tdStyle}">${c.estado_final || '---'}</td>

      <td style="${tdStyle} color:#ef4444;">
      ${c.dias_sin_pagar || 0}
      </td>

      <td style="${tdStyle} color:#3b82f6;">
      ${c.dias_sin_cumplir || 0}
      </td>

      <td style="padding:10px;text-align:center;">
      <a href="/editar/${c.id}" 
      style="color:#3b82f6;text-decoration:none;font-weight:bold;">
      [LIQUIDAR]
      </a>
      </td>

      </tr>
      `;

    }).join('');

    res.send(`
    <body style="background:#0f172a;color:white;font-family:sans-serif;padding:20px">

    <h2 style="color:#3b82f6;">YEGO SISTEMA CONTABLE</h2>

    <h3 style="color:#ef4444;">
    TOTAL POR PAGAR: $ ${totalPendiente.toLocaleString('es-CO')}
    </h3>

    <input id="buscador" placeholder="Buscar placa..."
    style="width:100%;padding:10px;margin-bottom:15px;background:#1e293b;color:white;border:1px solid #334155">

    <div style="overflow-x:auto">

    <table style="width:100%;border-collapse:collapse;background:#1e293b">

    <thead style="background:#1e40af;font-size:11px;">
    <tr>

    <th>ID</th>
    <th>FECHA</th>
    <th>OFICINA</th>
    <th>ORIGEN</th>
    <th>DESTINO</th>
    <th>CLIENTE</th>
    <th>CONT</th>
    <th>PED</th>
    <th>PLACA</th>
    <th>MUC</th>
    <th>FLETE PAGAR</th>
    <th>FACTURAR</th>
    <th>F ACT</th>
    <th>ESTADO</th>

    <th colspan="20">GESTIÓN CONTABLE</th>

    <th>ACCION</th>

    </tr>
    </thead>

    <tbody id="tabla">
    ${filas}
    </tbody>

    </table>

    </div>

<script>

document.getElementById("buscador").addEventListener("input", e => {

const term = e.target.value.toLowerCase()

document.querySelectorAll(".fila-carga").forEach(f => {

f.style.display =
f.dataset.placa.includes(term) ? "" : "none"

})

})

</script>

</body>
`);

  } catch (err) {
    res.status(500).send(err.message);
  }
});
