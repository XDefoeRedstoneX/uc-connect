import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export default function SessionExpiredPage() {
  return (
    <SiteLayout title="Sesi Berakhir | UC Connect">
      <EmptyState
        icon="clock"
        title="Sesi Berakhir"
        description="Sesi kamu telah berakhir demi keamanan. Silakan masuk kembali untuk melanjutkan."
        action={<Button href="/auth/login" iconRight="arrow-right">Masuk Lagi</Button>}
      />
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
