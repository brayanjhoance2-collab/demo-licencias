// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import ConfiguracionAdmin from "@/_PAGES/admin/Contenido/Configuracion/configuracion";
export default function page() {
  return (
    <div>
      <ClienteWrapper>
        <ConfiguracionAdmin></ConfiguracionAdmin>
      </ClienteWrapper>
    </div>
  );
}
