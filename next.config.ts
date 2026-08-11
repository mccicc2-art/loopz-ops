import type { NextConfig } from "next";

// لوحةٌ داخلية: لا فهرسة، ولا حاجة لصور خارجية.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};
export default nextConfig;
