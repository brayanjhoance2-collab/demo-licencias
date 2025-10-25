// app/(main)/layout.jsx
import ClienteWrapper from "@/_EXTRAS/LadoCliente/ClienteWraper";
import Header from "@/_PAGES/main/Fijos/header/header";
export default function MainLayout({ children }) {
  return (
    <>
      <div>
        <ClienteWrapper>
          <Header></Header>
        </ClienteWrapper>
      </div>
      {children}
    </>
  );
}