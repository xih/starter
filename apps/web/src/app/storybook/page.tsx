import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StorybookPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchParamsObj = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParamsObj.append(key, v));
    } else if (value !== undefined) {
      searchParamsObj.append(key, value);
    }
  }
  const queryString = searchParamsObj.toString();
  redirect("/storybook/index.html" + (queryString ? "?" + queryString : ""));
}
