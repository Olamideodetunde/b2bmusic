import { NextResponse, type NextRequest } from 'next/server';

/**
 * One URL per page: catalog URLs are lowercase slugs, so /genres/Ambient or
 * /tracks/Lo-Fi-Tech… get a permanent (308) redirect to the lowercase URL instead of
 * rendering a duplicate. (Done here rather than in the pages so the response is a
 * real redirect on the very first request, not a streamed refresh.)
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const lower = pathname.toLowerCase();
  if (lower !== pathname) {
    const url = req.nextUrl.clone();
    url.pathname = lower;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/genres/:path*', '/use-cases/:path*', '/bpm/:path*', '/tracks/:path*'],
};
