import { NextRequest, NextResponse } from 'next/server';

import { getPayoutProvider } from '@/lib/payout/providers/registry';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Reference is required' },
        { status: 400 },
      );
    }

    const provider = getPayoutProvider();
    const data = await provider.checkTransferStatus({ reference });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error('Transfer status error:', error);

    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response &&
      error.response.data &&
      typeof error.response.data === 'object' &&
      'message' in error.response.data
    ) {
      return NextResponse.json(
        {
          success: false,
          message: (error.response.data as { message: string }).message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch transfer status. Please try again.',
      },
      { status: 500 },
    );
  }
}
