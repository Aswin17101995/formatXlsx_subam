import FileUpload from "@/components/FileUpload";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header/>
      <FileUpload/>
    </div>
  );
}
