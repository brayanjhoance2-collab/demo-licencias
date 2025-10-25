// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import UsuariosAdmin from "@/_PAGES/admin/Contenido/Usuarios/usuarios";
export default function page() {
  return (
    <div>
      <ClienteWrapper>
        <UsuariosAdmin></UsuariosAdmin>
      </ClienteWrapper>
    </div>
  );
}
