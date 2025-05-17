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
  username: z.string().min(1, "Please enter username"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignUpUser = z.infer<typeof formSchema>;

export default function AuthSignin() {
  const { signinWithGithub } = useAuthStore();
  const form = useForm<SignUpUser>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignUpUser) {
    try {
      const response = await fetch("http://localhost:8000/api/v1/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registration successful! Please login.");
        // Redirect to login page
        window.location.href = "/auth";
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while signing up. Please try again.");
    }
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <div className="flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <img src={logoDark} alt="logo" className="h-12 w-12" />
                <div>AI THUYẾT MINH</div>
              </div>
              <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-black dark:text-white">
                Create your account
              </h2>
            </div>

            <div className="mt-10">
              <div>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                placeholder="yourusername"
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <label
                            htmlFor="email"
                            className="dark:text-muted-dark block text-sm font-medium leading-6 text-muted-foreground"
                          >
                            Email
                          </label>
                          <FormControl>
                            <div className="mt-2">
                              <input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
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
                                placeholder="yourpassword"
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
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <label
                            htmlFor="confirmPassword"
                            className="dark:text-muted-dark block text-sm font-medium leading-6 text-muted-foreground"
                          >
                            Confirm Password
                          </label>
                          <FormControl>
                            <div className="mt-2">
                              <input
                                id="confirmPassword"
                                type="password"
                                placeholder="confirm your password"
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
                    <Button type="submit" className="w-full">
                      Sign up
                    </Button>
                  </div>

                  <div className="text-sm">
                    Already have an account?
                    <Link
                      to="/auth"
                      className="font-semibold text-neutral-500 hover:text-neutral-400 dark:text-neutral-300"
                    >
                      Log in
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
                  By clicking on sign up, you agree to our{" "}
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
