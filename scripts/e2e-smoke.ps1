$ErrorActionPreference = "Stop"

$base = "http://localhost:3000"
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$passengerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Assert-Condition($condition, [string]$message) {
  if (-not $condition) {
    throw $message
  }
}

# 1) Admin login
$adminLoginBody = @{
  email    = "itspectre1@gmail.com"
  password = "ITSpectre@123"
} | ConvertTo-Json -Compress

$adminLogin = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -WebSession $adminSession -ContentType "application/json" -Body $adminLoginBody
Assert-Condition ($null -ne $adminLogin.user) "Admin login failed"

# 2) Create flight as admin
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$flightSuffix = ($timestamp % 100000).ToString().PadLeft(5, "0")
$flightNumber = "SB$flightSuffix"
$dep = (Get-Date).ToUniversalTime().AddHours(30).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$arr = (Get-Date).ToUniversalTime().AddHours(36).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$flightBody = @{
  flightNumber      = $flightNumber
  origin            = "LOS"
  destination       = "NBO"
  departureDateTime = $dep
  arrivalDateTime   = $arr
  totalSeats        = 40
  pricePerSeat      = 199.99
} | ConvertTo-Json -Compress

$createFlight = Invoke-RestMethod -Uri "$base/api/flights" -Method Post -WebSession $adminSession -ContentType "application/json" -Body $flightBody
Assert-Condition ($null -ne $createFlight.data -and $null -ne $createFlight.data.id) "Create flight failed"
$flightId = $createFlight.data.id

# 3) Register passenger
$passengerEmail = "passenger.$timestamp@skybook.dev"
$registerBody = @{
  fullName = "SkyBook Passenger"
  email    = $passengerEmail
  password = "Passenger@123"
} | ConvertTo-Json -Compress

$register = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -WebSession $passengerSession -ContentType "application/json" -Body $registerBody
Assert-Condition ($null -ne $register.user -and $null -ne $register.user.id) "Passenger registration failed"

# 4) Create booking as passenger
$bookingBody = @{
  flightId   = $flightId
  seatNumber = "12A"
} | ConvertTo-Json -Compress

$booking = Invoke-RestMethod -Uri "$base/api/bookings" -Method Post -WebSession $passengerSession -ContentType "application/json" -Body $bookingBody
Assert-Condition ($null -ne $booking.data -and $null -ne $booking.data.id) "Create booking failed"
$bookingId = $booking.data.id
$bookingRef = $booking.data.bookingReference

# 5) Retrieve ticket publicly
$ticket = Invoke-RestMethod -Uri "$base/api/tickets/$bookingRef" -Method Get
Assert-Condition ($null -ne $ticket.data -and $ticket.data.bookingReference -eq $bookingRef) "Ticket retrieval failed"

# 6) Cancel booking
$cancelBody = @{ reason = "PASSENGER_REQUEST" } | ConvertTo-Json -Compress
$cancel = Invoke-RestMethod -Uri "$base/api/bookings/$bookingId/cancel" -Method Patch -WebSession $passengerSession -ContentType "application/json" -Body $cancelBody
Assert-Condition ($null -ne $cancel.data -and $cancel.data.status -eq "CANCELLED") "Booking cancellation failed"

# 7) Admin check flight bookings
$adminFlightBookings = Invoke-RestMethod -Uri "$base/api/flights/$flightId/bookings" -Method Get -WebSession $adminSession
Assert-Condition ($null -ne $adminFlightBookings.data) "Admin flight bookings lookup failed"

[pscustomobject]@{
  AdminEmail          = $adminLogin.user.email
  FlightNumber        = $flightNumber
  FlightId            = $flightId
  PassengerEmail      = $passengerEmail
  BookingId           = $bookingId
  BookingReference    = $bookingRef
  TicketStatus        = $ticket.data.status
  CancelStatus        = $cancel.data.status
  FlightBookingsCount = ($adminFlightBookings.data | Measure-Object).Count
} | ConvertTo-Json -Depth 8
