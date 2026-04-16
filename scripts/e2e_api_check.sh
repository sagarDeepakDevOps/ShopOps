#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:8000/api/v1"
RUN_ID=$(date +%s)
CUSTOMER_EMAIL="customer-${RUN_ID}@example.com"
ADMIN_EMAIL="admin-${RUN_ID}@example.com"
SKU_ID="PHONE-${RUN_ID}"
CATEGORY_NAME="Electronics-${RUN_ID}"

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local auth="${4:-}"
  local tmp
  tmp=$(mktemp)
  local code

  if [[ -n "$auth" ]]; then
    if [[ -n "$data" ]]; then
      code=$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $auth" -d "$data")
    else
      code=$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $auth")
    fi
  else
    if [[ -n "$data" ]]; then
      code=$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    else
      code=$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url")
    fi
  fi

  cat "$tmp"
  rm -f "$tmp"
  echo "|HTTP_CODE=$code"
}

assert_code() {
  local output="$1"
  local expected="$2"
  local actual
  actual=$(echo "$output" | sed -n 's/.*|HTTP_CODE=\([0-9]*\)$/\1/p')
  if [[ "$actual" != "$expected" ]]; then
    echo "Expected HTTP $expected but got $actual"
    echo "$output"
    exit 1
  fi
}

body_only() {
  echo "$1" | sed 's/|HTTP_CODE=.*$//'
}

health_out=$(request GET "$BASE/health")
assert_code "$health_out" "200"

short_pw=$(request POST "$BASE/auth/register" "{\"email\":\"bad-${RUN_ID}@example.com\",\"password\":\"123\",\"full_name\":\"Bad\"}")
assert_code "$short_pw" "422"

reg_customer=$(request POST "$BASE/auth/register" "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"Password123!\",\"full_name\":\"Customer User\"}")
assert_code "$reg_customer" "200"
customer_id=$(body_only "$reg_customer" | jq -r '.user.id')

bad_login=$(request POST "$BASE/auth/login" "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"WrongPass123!\"}")
assert_code "$bad_login" "401"

login_customer=$(request POST "$BASE/auth/login" "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"Password123!\"}")
assert_code "$login_customer" "200"
customer_access=$(body_only "$login_customer" | jq -r '.tokens.access_token')
customer_refresh=$(body_only "$login_customer" | jq -r '.tokens.refresh_token')

refresh_out=$(request POST "$BASE/auth/refresh" "{\"refresh_token\":\"$customer_refresh\"}")
assert_code "$refresh_out" "200"

logout_out=$(request POST "$BASE/auth/logout")
assert_code "$logout_out" "200"

reg_admin=$(request POST "$BASE/auth/register" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Password123!\",\"full_name\":\"Admin User\"}")
assert_code "$reg_admin" "200"
docker compose exec -T postgres psql -U shopops -d shopops -c "UPDATE users SET role='ADMIN' WHERE email='${ADMIN_EMAIL}';" >/dev/null

admin_login=$(request POST "$BASE/auth/login" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Password123!\"}")
assert_code "$admin_login" "200"
admin_access=$(body_only "$admin_login" | jq -r '.tokens.access_token')

me_out=$(request GET "$BASE/users/me" "" "$customer_access")
assert_code "$me_out" "200"

update_me=$(request PATCH "$BASE/users/me" '{"full_name":"Customer Updated"}' "$customer_access")
assert_code "$update_me" "200"

addr_create=$(request POST "$BASE/users/me/addresses" '{"label":"Home","line1":"1 Test St","line2":null,"city":"Austin","state":"TX","country":"US","postal_code":"78701","note":"Primary"}' "$customer_access")
assert_code "$addr_create" "201"
addr_id=$(body_only "$addr_create" | jq -r '.id')

addr_list=$(request GET "$BASE/users/me/addresses" "" "$customer_access")
assert_code "$addr_list" "200"

addr_update=$(request PATCH "$BASE/users/me/addresses/$addr_id" '{"city":"Dallas"}' "$customer_access")
assert_code "$addr_update" "200"

addr_delete=$(request DELETE "$BASE/users/me/addresses/$addr_id" "" "$customer_access")
assert_code "$addr_delete" "204"

cat_create=$(request POST "$BASE/products/categories" "{\"name\":\"$CATEGORY_NAME\",\"description\":\"Devices\"}" "$admin_access")
assert_code "$cat_create" "201"
cat_id=$(body_only "$cat_create" | jq -r '.id')

prod_create=$(request POST "$BASE/products" "{\"category_id\":\"$cat_id\",\"sku\":\"$SKU_ID\",\"name\":\"Phone\",\"description\":\"Smart phone\",\"price\":\"599.99\",\"stock\":20}" "$admin_access")
assert_code "$prod_create" "201"
prod_id=$(body_only "$prod_create" | jq -r '.id')

forbidden_create=$(request POST "$BASE/products" '{"sku":"NOPE-001","name":"Nope","description":"No","price":"10.00","stock":1}' "$customer_access")
assert_code "$forbidden_create" "403"

prod_list=$(request GET "$BASE/products?page=1&page_size=10&search=Phone&sort_by=price&sort_order=asc")
assert_code "$prod_list" "200"

prod_update=$(request PATCH "$BASE/products/$prod_id" '{"price":"549.99","stock":25}' "$admin_access")
assert_code "$prod_update" "200"

bad_cart=$(request POST "$BASE/orders/cart/items" "{\"product_id\":\"$prod_id\",\"quantity\":0}" "$customer_access")
assert_code "$bad_cart" "422"

cart_add=$(request POST "$BASE/orders/cart/items" "{\"product_id\":\"$prod_id\",\"quantity\":2}" "$customer_access")
assert_code "$cart_add" "200"

cart_get=$(request GET "$BASE/orders/cart" "" "$customer_access")
assert_code "$cart_get" "200"

cart_remove=$(request DELETE "$BASE/orders/cart/items/$prod_id" "" "$customer_access")
assert_code "$cart_remove" "200"

cart_add2=$(request POST "$BASE/orders/cart/items" "{\"product_id\":\"$prod_id\",\"quantity\":1}" "$customer_access")
assert_code "$cart_add2" "200"

checkout1=$(request POST "$BASE/orders/checkout" '{"shipping_address":"100 Market St, Austin, TX"}' "$customer_access")
assert_code "$checkout1" "201"
order1_id=$(body_only "$checkout1" | jq -r '.id')

orders_hist=$(request GET "$BASE/orders" "" "$customer_access")
assert_code "$orders_hist" "200"

pay_fail=$(request POST "$BASE/payments/orders/$order1_id/process?force_outcome=failed" "" "$customer_access")
assert_code "$pay_fail" "200"

pay_conflict=$(request POST "$BASE/payments/orders/$order1_id/process" "" "$customer_access")
assert_code "$pay_conflict" "409"

pay_retry=$(request POST "$BASE/payments/orders/$order1_id/process?retry=true&force_outcome=success" "" "$customer_access")
assert_code "$pay_retry" "200"

cart_add3=$(request POST "$BASE/orders/cart/items" "{\"product_id\":\"$prod_id\",\"quantity\":1}" "$customer_access")
assert_code "$cart_add3" "200"

checkout2=$(request POST "$BASE/orders/checkout" '{"shipping_address":"200 Main St, Austin, TX"}' "$customer_access")
assert_code "$checkout2" "201"
order2_id=$(body_only "$checkout2" | jq -r '.id')

pay_success=$(request POST "$BASE/payments/orders/$order2_id/process?force_outcome=success" "" "$customer_access")
assert_code "$pay_success" "200"

admin_dash=$(request GET "$BASE/admin/dashboard" "" "$admin_access")
assert_code "$admin_dash" "200"

admin_users=$(request GET "$BASE/admin/users" "" "$admin_access")
assert_code "$admin_users" "200"

admin_orders=$(request GET "$BASE/admin/orders" "" "$admin_access")
assert_code "$admin_orders" "200"

admin_order_status=$(request PATCH "$BASE/admin/orders/$order2_id/status" '{"status":"shipped"}' "$admin_access")
assert_code "$admin_order_status" "200"

admin_deactivate=$(request PATCH "$BASE/admin/users/$customer_id/deactivate" '{}' "$admin_access")
assert_code "$admin_deactivate" "200"

prod_delete=$(request DELETE "$BASE/products/$prod_id" "" "$admin_access")
assert_code "$prod_delete" "204"

echo "API_E2E_VALIDATION=PASS"
