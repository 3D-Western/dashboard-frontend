'use client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useState } from 'react';

export default function Signup() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const [program, setProgram] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen gap-y-[90px] bg-[url('/signupgraphic.png')] bg-cover">
      <span className="font-jersey text-[96px]">SIGN UP</span>
      <div className="flex flex-wrap gap-y-[24px] px-[71px] gap-x-[74px] justify-center">
        <div className="flex flex-col w-[325px] justify-between">
          <span className="font-jersey text-[26px]">Name</span>
          <Input
            type="text"
            placeholder="NAME"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black text-[20px] !text-[20px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col w-[325px]">
          <span className="font-jersey text-[26px]">UWO EMAIL</span>
          <Input
            type="text"
            placeholder="UWO EMAIL"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col w-[325px]">
          <span className="font-jersey text-[26px]">PASSWORD</span>
          <Input
            type="text"
            placeholder="PASSWORD"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col w-[325px]">
          <span className="font-jersey text-[26px]">STUDENT NUMBER</span>
          <Input
            type="text"
            placeholder="STUDENT NUMBER"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black !text-[20px]"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col w-[325px]">
          <span className="font-jersey text-[26px]">CURRENT YEAR</span>
          <Select>
            <SelectTrigger className="w-[325px] h-[43px] !bg-white !text-[20px] text-black">
              <SelectValue placeholder="Current Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First Year</SelectItem>
              <SelectItem value="second">Second Year</SelectItem>
              <SelectItem value="third">Third Year</SelectItem>
              <SelectItem value="fourth">Fourth Year</SelectItem>
              <SelectItem value="fifth">Fifth Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col w-[325px]">
          <span className="font-jersey text-[26px]">PROGRAM</span>
          <Input
            type="text"
            placeholder="PROGRAM"
            className="!bg-white w-[325px] h-[43px] placeholder:text-[20px] text-black"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-y-[46px] items-center">
        <div className="flex items-center gap-x-[16px]">
          <Checkbox></Checkbox>
          <span className="font-jersey text-[20px]">
            I have read the{' '}
            <Link href="/terms-and-conditions" className="underline">
              terms and conditions
            </Link>{' '}
            and agree to 3D Western's{' '}
            <Link href="/data-policy" className="underline">
              data policy
            </Link>
            .
          </span>
        </div>
        <Button className="w-[160px] h-[63px] text-[30px]">REGISTER</Button>
        <span className="font-jersey text-[20px]">
          Having Issues?{' '}
          <Link href="/contact-us" className="underline">
            Contact us
          </Link>
        </span>
      </div>
    </div>
  );
}
