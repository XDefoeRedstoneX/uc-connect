import SiteLayout from "@/components/SiteLayout";
import { GetServerSideProps } from "next";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export default function UnauthorizedPage() {
  return (
    <SiteLayout title="Akses Ditolak | UC Connect">
      <EmptyState
        icon="lock"
        title="Akses Ditolak"
        description="Kamu tidak punya izin untuk mengakses halaman ini. Masuk dengan akun yang sesuai."
        action={<Button href="/auth/login" iconRight="arrow-right">Ke Halaman Masuk</Button>}
      />
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
