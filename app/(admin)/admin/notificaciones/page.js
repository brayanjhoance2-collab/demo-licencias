// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import NotificacionesAdmin from "@/_PAGES/admin/Contenido/notificaciones/notificaciones";
export default function page() {
  return (
    <div>
      <ClienteWrapper>
        <NotificacionesAdmin></NotificacionesAdmin>
      </ClienteWrapper>
    </div>
  );
}
