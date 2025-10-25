// app/(main)/layout.jsx
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import HeaderAdmin from "@/_PAGES/admin/Fijos/header/header";
export default function MainLayout({ children }) {
  return (
    <>
      <div>
        <ClienteWrapper>
          <HeaderAdmin></HeaderAdmin>
        </ClienteWrapper>
      </div>
      {children}
    </>
  );
}