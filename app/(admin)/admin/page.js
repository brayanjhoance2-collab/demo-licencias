// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import DashboardAdmin from "@/_PAGES/admin/Contenido/Home/Dashboard";
export default function page() {
  return (
    <div>
      <ClienteWrapper>
        <DashboardAdmin></DashboardAdmin>
      </ClienteWrapper>
    </div>
  );
}
