import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export default function Login() {
  return (
    <>
      <div className="flex items-center justify-center min-h-screen py-2">
        <div className="flex flex-col items-center gap-6 mr-20">
          <span className="font-jersey text-[96px]">LOGIN</span>
          <Input
            placeholder="email"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px]"
          ></Input>
          <Input
            placeholder="password"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px]"
          ></Input>
          <Link href="/forgot-password" className="font-jersey underline text-[16px]">
            Forgot Password?
          </Link>
          <Button variant="default" className="w-[160px] h-[63px] text-[30px]">
            PRINT NOW
          </Button>
          <Link href="/sign-up">SIGN UP</Link>
        </div>
        <Image src="3dWesternLogo.svg" alt="3D Western Logo" width={750} height={765}></Image>
      </div>
    </>
  );
}
