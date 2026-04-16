import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createCategory,
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
} from "../api/products";
import { ApiError } from "../components/ui/ApiError";
import { Loader } from "../components/ui/Loader";
import { PageTitle } from "../components/ui/PageTitle";
import { extractErrorMessage } from "../lib/errors";
import { formatCurrency, formatDateTime } from "../lib/utils";
import type { ProductRead } from "../types/api";

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const productSchema = z.object({
  category_id: z.string().optional(),
  sku: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Price must be numeric"),
  stock: z.number().int().min(0),
});

type CategoryForm = z.infer<typeof categorySchema>;
type ProductForm = z.infer<typeof productSchema>;

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<ProductRead | null>(null);

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const productsQuery = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () =>
      listProducts({
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
      }),
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const productForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category_id: "",
      sku: "",
      name: "",
      description: "",
      price: "",
      stock: 0,
    },
  });

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success("Category created");
      categoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["categories"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to create category"));
    },
  });

  const productMutation = useMutation({
    mutationFn: (values: ProductForm) => {
      if (editingProduct) {
        return updateProduct(editingProduct.id, {
          category_id: values.category_id || undefined,
          sku: values.sku,
          name: values.name,
          description: values.description || undefined,
          price: values.price,
          stock: values.stock,
        });
      }

      return createProduct({
        category_id: values.category_id || undefined,
        sku: values.sku,
        name: values.name,
        description: values.description || undefined,
        price: values.price,
        stock: values.stock,
      });
    },
    onSuccess: () => {
      toast.success(editingProduct ? "Product updated" : "Product created");
      setEditingProduct(null);
      productForm.reset({
        category_id: "",
        sku: "",
        name: "",
        description: "",
        price: "",
        stock: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["products"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to save product"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["products"] }).catch(() => undefined);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "Unable to delete product"));
    },
  });

  const loading = categoriesQuery.isLoading || productsQuery.isLoading;
  const failed = categoriesQuery.isError || productsQuery.isError;

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Admin panel"
        title="Products and inventory"
        subtitle="Manage categories, product metadata, stock, and pricing from the UI."
      />

      {loading ? <Loader label="Loading inventory data..." /> : null}
      {failed ? <ApiError message="Unable to load product management data." /> : null}

      {!loading && !failed ? (
        <>
          <section className="grid gap-5 lg:grid-cols-2">
            <form
              onSubmit={categoryForm.handleSubmit((values) => categoryMutation.mutate(values))}
              className="glass-panel space-y-3 rounded-3xl p-5"
            >
              <h2 className="text-2xl text-slate-900">Create category</h2>
              <input
                placeholder="Category name"
                {...categoryForm.register("name")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                rows={3}
                placeholder="Description"
                {...categoryForm.register("description")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={categoryMutation.isPending}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {categoryMutation.isPending ? "Saving..." : "Create category"}
              </button>
            </form>

            <form
              onSubmit={productForm.handleSubmit((values) => productMutation.mutate(values))}
              className="glass-panel space-y-3 rounded-3xl p-5"
            >
              <h2 className="text-2xl text-slate-900">
                {editingProduct ? `Edit ${editingProduct.name}` : "Create product"}
              </h2>

              <select
                {...productForm.register("category_id")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">No category</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  placeholder="SKU"
                  {...productForm.register("sku")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  placeholder="Name"
                  {...productForm.register("name")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  placeholder="Price"
                  {...productForm.register("price")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  {...productForm.register("stock", { valueAsNumber: true })}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <textarea
                rows={3}
                placeholder="Description"
                {...productForm.register("description")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={productMutation.isPending}
                  className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  {productMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                </button>
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      productForm.reset({
                        category_id: "",
                        sku: "",
                        name: "",
                        description: "",
                        price: "",
                        stock: 0,
                      });
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="glass-panel rounded-3xl p-5">
            <h2 className="text-2xl text-slate-900">Inventory list</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.15em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productsQuery.data?.items.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-semibold text-slate-900">{product.name}</td>
                      <td className="px-3 py-2">{product.sku}</td>
                      <td className="px-3 py-2">{product.category?.name ?? "-"}</td>
                      <td className="px-3 py-2">{formatCurrency(product.price)}</td>
                      <td className="px-3 py-2">{product.stock}</td>
                      <td className="px-3 py-2">{formatDateTime(product.updated_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(product);
                              productForm.reset({
                                category_id: product.category_id ?? "",
                                sku: product.sku,
                                name: product.name,
                                description: product.description ?? "",
                                price: product.price,
                                stock: product.stock,
                              });
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(product.id)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
