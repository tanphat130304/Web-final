import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import logoDark from "@/assets/logo-dark.png";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { IconBrandGithub } from "@tabler/icons-react";
import { Button } from "../../components/button";
import { Link } from "react-router-dom";
import { AuthLayout } from "./auth-layout";
import useAuthStore from "@/store/use-auth-store";

const formSchema = z.object({
  username: z
    .string({
      required_error: "Vui lòng nhập tên đăng nhập",
    })
    .min(1, "Vui lòng nhập tên đăng nhập"),
  password: z
    .string({
      required_error: "Vui lòng nhập mật khẩu",
    })
    .min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginUser = z.infer<typeof formSchema>;

export default function Auth() {
  const { login, signinWithGithub } = useAuthStore();
  const form = useForm<LoginUser>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginUser) {
    try {
      const result = await login(values);
      if (result.error) {
        alert(result.error);
      }
    } catch (e) {
      console.error("Login error:", e);
      alert("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");
    }
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <div className="flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <img src={logoDark} alt="logo" className="h-20 w-20" />
                <div
                  onClick={() => {
                    window.location.href = "/";
                  }
                  }
                >
                  AI THUYẾT MINH
                  </div>
              </div>
              <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-black dark:text-white">
                Sign in to your account
              </h2>
            </div>

            <div className="mt-10">
              <div>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <label
                            htmlFor="username"
                            className="dark:text-muted-dark block text-sm font-medium leading-6 text-muted-foreground"
                          >
                            Username
                          </label>
                          <FormControl>
                            <div className="mt-2">
                              <input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                className="shadow-aceternity block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-white sm:text-sm sm:leading-6"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <label
                            htmlFor="password"
                            className="dark:text-muted-dark block text-sm font-medium leading-6 text-muted-foreground"
                          >
                            Password
                          </label>
                          <FormControl>
                            <div className="mt-2">
                              <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                className="shadow-aceternity block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-white sm:text-sm sm:leading-6"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <Button className="w-full">Sign in</Button>
                  </div>

                  <div className="text-sm"> Don't have an account?
                    <Link 
                    to="/auth/register"
                    className="font-semibold text-neutral-500 hover:text-neutral-400 dark:text-neutral-300"
                    >
                      Register
                      </Link>
                  </div>
                </form>
              </div>

              <div className="mt-10">
                <div className="relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-neutral-300 dark:border-neutral-700" />
                  </div>
                  <div className="relative flex justify-center text-sm font-medium leading-6">
                    <span className="bg-white px-6 text-neutral-400 dark:bg-black dark:text-neutral-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex w-full items-center justify-center">
                  <Button onClick={signinWithGithub} className="w-full py-1.5">
                    <IconBrandGithub className="h-5 w-5" />
                    <span className="text-sm font-semibold leading-6">
                      Github
                    </span>
                  </Button>
                </div>

                <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                  By clicking on sign in, you agree to our{" "}
                  <Link
                    to="#"
                    className="text-neutral-500 dark:text-neutral-300"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="#"
                    className="text-neutral-500 dark:text-neutral-300"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </AuthLayout>
  );
}
