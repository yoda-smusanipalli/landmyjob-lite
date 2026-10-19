/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Resumes and JDs are uploaded through Server Actions; the default limit is 1 MB.
    // Vercel rejects request bodies over 4.5 MB, so stay just under that.
    serverActions: { bodySizeLimit: "4.4mb" },
    serverComponentsExternalPackages: ["mammoth", "unpdf"],
  },
};
export default nextConfig;
