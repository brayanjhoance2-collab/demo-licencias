// app/page.js
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import Login from "@/_PAGES/main/Contenido/login/login";
import CrearAdministradorInicial from "@/_EXTRAS/Crear/crear";
export default function page() {
  return (
    <div>
      <CrearAdministradorInicial></CrearAdministradorInicial>
      <ClienteWrapper>
        <Login></Login>
      </ClienteWrapper>
    </div>
  );
}
