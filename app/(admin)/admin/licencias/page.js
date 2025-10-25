// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import LicenciasAdmin from "@/_PAGES/admin/Contenido/licencias/licencias";
export default function page() {
  return (
    <div>
      <ClienteWrapper>
        <LicenciasAdmin></LicenciasAdmin>
      </ClienteWrapper>
    </div>
  );
}
